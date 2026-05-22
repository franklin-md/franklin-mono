// @vitest-environment jsdom
import { reduceExtensions } from '@franklin/extensibility';
import { describe, expect, it, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { compileCoreWithEnv } from '../../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import { webSearchProviders } from '../configuration.js';
import { webSearchExtension, webSearchToolExtension } from '../extension.js';
import type { WebSearchProvider } from '../provider.js';
import { createDuckDuckGoWebSearchProvider } from '../providers/duck-duck-go/provider.js';
import { createExaWebSearchProvider } from '../providers/exa/provider.js';

function mockEnvironment(
	fetchImpl: NonNullable<ReconfigurableEnvironment['web']>['fetch'],
): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(),
			readdir: vi.fn(),
			exists: vi.fn(),
			glob: vi.fn(),
			deleteFile: vi.fn(),
			resolve: vi.fn(),
		},
		process: { exec: vi.fn() },
		web: { fetch: vi.fn(fetchImpl) },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function compileSearch(env: ReconfigurableEnvironment) {
	return compileCoreWithEnv(
		reduceExtensions(
			webSearchProviderExtension(createExaWebSearchProvider()),
			webSearchProviderExtension(createDuckDuckGoWebSearchProvider()),
			webSearchExtension({ maxRetries: 1 }),
		),
		env,
	);
}

function compileSearchExtension(
	env: ReconfigurableEnvironment,
	extension: Parameters<typeof compileCoreWithEnv>[0],
) {
	return compileCoreWithEnv(extension, env);
}

type Compiled = Awaited<ReturnType<typeof compileSearch>>;

async function executeSearch(compiled: Compiled, query: string) {
	return compiled.middleware.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'c1',
				name: 'search_web',
				arguments: { query },
			},
		},
		vi.fn(),
	);
}

function getResultText(result: {
	content: Array<{ type: string; text?: string }>;
}): string {
	return result.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text ?? '')
		.join('\n');
}

function textResponse(body: string, contentType: string) {
	return {
		url: 'https://example.com',
		status: 200,
		statusText: 'OK',
		headers: { 'Content-Type': contentType },
		body: new TextEncoder().encode(body),
	};
}

function webSearchProviderExtension(provider: WebSearchProvider) {
	return webSearchProviders.of(provider);
}

describe('webSearchExtension', () => {
	it('uses Exa before DuckDuckGo when Exa succeeds', async () => {
		const env = mockEnvironment(async () =>
			textResponse(
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					result: {
						content: [
							{
								type: 'text',
								text: 'Title: Example\nURL: https://example.com\nText: Example snippet',
							},
						],
					},
				}),
				'application/json',
			),
		);
		const compiled = await compileSearch(env);

		const toolResult = await executeSearch(compiled, 'example');
		const fetchMock = env.web.fetch as ReturnType<typeof vi.fn>;

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://mcp.exa.ai/mcp',
				method: 'POST',
			}),
		);
		expect(toolResult.isError).toBe(false);
		expect(getResultText(toolResult)).toContain('https://example.com');
	});

	it('falls back to DuckDuckGo when Exa fails', async () => {
		const env = mockEnvironment(
			vi
				.fn()
				.mockResolvedValueOnce({
					...textResponse('rate limited', 'text/plain'),
					status: 429,
					statusText: 'Too Many Requests',
				})
				.mockResolvedValueOnce(
					textResponse(
						`
							<html><body><table>
								<tr><td><a class="result-link" href="https://fallback.test/">Fallback</a></td></tr>
								<tr><td class="result-snippet">Fallback snippet.</td></tr>
							</table></body></html>
							`,
						'text/html',
					),
				),
		);
		const compiled = await compileSearch(env);

		const toolResult = await executeSearch(compiled, 'fallback example');
		const fetchMock = env.web.fetch as ReturnType<typeof vi.fn>;

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				url: 'https://mcp.exa.ai/mcp',
				method: 'POST',
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				url: expect.stringContaining('https://duckduckgo.com/lite'),
				method: 'GET',
			}),
		);
		expect(toolResult.isError).toBe(false);
		expect(getResultText(toolResult)).toContain('Fallback snippet.');
	});

	it('returns a combined error when Exa and DuckDuckGo both fail', async () => {
		const env = mockEnvironment(
			vi
				.fn()
				.mockResolvedValueOnce({
					...textResponse('blocked', 'text/plain'),
					status: 500,
					statusText: 'Internal Server Error',
				})
				.mockResolvedValueOnce(textResponse('not html', 'application/json')),
		);
		const compiled = await compileSearch(env);

		const toolResult = await executeSearch(compiled, 'broken');

		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('Exa MCP failed:');
		expect(getResultText(toolResult)).toContain('DuckDuckGo failed:');
	});

	it('runs providers in configured order', async () => {
		const env = mockEnvironment(async () => {
			throw new Error('later provider should not fetch');
		});
		const customProvider: WebSearchProvider = {
			name: 'Custom',
			search: vi.fn(async () => [
				{
					title: 'Custom result',
					url: 'https://custom.test/',
					snippet: 'Custom snippet.',
				},
			]),
		};
		const compiled = await compileSearchExtension(
			env,
			reduceExtensions(
				webSearchProviderExtension(customProvider),
				webSearchExtension({ maxRetries: 1 }),
			),
		);

		const toolResult = await executeSearch(compiled, 'custom');
		const fetchMock = env.web.fetch as ReturnType<typeof vi.fn>;

		expect(fetchMock).not.toHaveBeenCalled();
		expect(customProvider.search).toHaveBeenCalledWith(
			expect.objectContaining({ query: 'custom' }),
		);
		expect(toolResult.isError).toBe(false);
		expect(getResultText(toolResult)).toContain('https://custom.test/');
	});

	it('returns no results when a configured provider succeeds with an empty list', async () => {
		const env = mockEnvironment(async () => {
			throw new Error('provider should not fetch');
		});
		const emptyProvider: WebSearchProvider = {
			name: 'Empty',
			search: vi.fn(async () => []),
		};
		const compiled = await compileSearchExtension(
			env,
			reduceExtensions(
				webSearchProviderExtension(emptyProvider),
				webSearchToolExtension({ maxRetries: 1 }),
			),
		);

		const toolResult = await executeSearch(compiled, 'empty');

		expect(toolResult.isError).toBe(false);
		expect(getResultText(toolResult)).toContain('No results found.');
	});

	it('returns an explicit error when no providers are configured', async () => {
		const env = mockEnvironment(async () => {
			throw new Error('provider should not fetch');
		});
		const compiled = await compileSearchExtension(
			env,
			webSearchExtension({ maxRetries: 1 }),
		);

		const toolResult = await executeSearch(compiled, 'missing');

		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain(
			'No web search providers configured',
		);
	});
});
