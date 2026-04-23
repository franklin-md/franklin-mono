// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { compileCoreWithEnv } from '../../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../../systems/environment/api/types.js';
import { webSearchExtension } from '../extension.js';

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
	return compileCoreWithEnv(webSearchExtension({ maxRetries: 1 }), env);
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
		expect(getResultText(toolResult)).toContain('DuckDuckGo fallback failed:');
	});
});
