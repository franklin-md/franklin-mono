// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { compile, combine } from '../../../../compile/types.js';
import { createCoreCompiler } from '../../../../compile/core/compiler.js';
import { createEnvironmentCompiler } from '../../../../compile/environment/compiler.js';
import type { ReconfigurableEnvironment } from '../../../../api/environment/types.js';
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
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn(fetchImpl) },
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp',
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['**'],
					denyWrite: [],
				},
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function compileSearch(env: ReconfigurableEnvironment) {
	const compiler = combine(
		createCoreCompiler(),
		createEnvironmentCompiler(env),
	);
	return compile(compiler, webSearchExtension({ maxRetries: 1 }));
}

async function executeSearch(
	result: Awaited<ReturnType<typeof compileSearch>>,
	query: string,
) {
	return result.server.toolExecute(
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
		requestedUrl: 'https://example.com',
		finalUrl: 'https://example.com',
		status: 200,
		statusText: 'OK',
		contentType,
		headers: {},
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
		const result = await compileSearch(env);

		const toolResult = await executeSearch(result, 'example');
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
		const result = await compileSearch(env);

		const toolResult = await executeSearch(result, 'fallback example');
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
		const result = await compileSearch(env);

		const toolResult = await executeSearch(result, 'broken');

		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('Exa MCP failed:');
		expect(getResultText(toolResult)).toContain('DuckDuckGo fallback failed:');
	});
});
