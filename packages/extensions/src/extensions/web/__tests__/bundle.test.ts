import { MemoryOsInfo, type AbsolutePath } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { compileCoreWithStoreAndEnv } from '../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import { webFetchCacheKey } from '../web-fetch/key.js';
import { createWebExtension } from '../index.js';

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

function mockEnvironment(
	fetchImpl: NonNullable<ReconfigurableEnvironment['web']>['fetch'],
): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(async () => ({
				isFile: true,
				isDirectory: false,
			})),
			readdir: vi.fn(async () => []),
			exists: vi.fn(async () => true),
			glob: vi.fn(async () => []),
			deleteFile: vi.fn(async () => {}),
			resolve: vi.fn(
				async (...paths: string[]) => paths[paths.length - 1]! as AbsolutePath,
			),
		},
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn(fetchImpl) },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp' as AbsolutePath,
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

function compileWeb(env: ReconfigurableEnvironment) {
	return compileCoreWithStoreAndEnv(
		createWebExtension({
			fetch: {
				timeoutMs: 1234,
				maxRedirects: 2,
			},
			search: {
				timeoutMs: 4321,
				maxRedirects: 7,
				maxRetries: 1,
			},
		}).extension,
		env,
	);
}

type Compiled = Awaited<ReturnType<typeof compileWeb>>;

async function executeTool(
	compiled: Compiled,
	name: string,
	args: Record<string, unknown>,
) {
	return compiled.middleware.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'c1',
				name,
				arguments: args,
			},
		},
		vi.fn(),
	);
}

describe('createWebExtension', () => {
	it('exposes both tools and preserves per-tool option routing', async () => {
		const env = mockEnvironment(async (request) => {
			if (request.url === 'https://example.com/docs') {
				return textResponse('Hello world', 'text/plain');
			}

			if (request.url === 'https://mcp.exa.ai/mcp') {
				return textResponse(
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
				);
			}

			throw new Error(`Unexpected url: ${request.url}`);
		});
		const bundle = createWebExtension({});
		const compiled = await compileWeb(env);

		expect(bundle.keys.cache).toBe(webFetchCacheKey);
		expect(bundle.tools.fetchUrl.name).toBe('fetch_url');
		expect(bundle.tools.searchWeb.name).toBe('search_web');

		const names = compiled.tools.map((tool) => tool.name);
		expect(names).toEqual(expect.arrayContaining(['fetch_url', 'search_web']));

		await executeTool(compiled, 'fetch_url', {
			url: 'https://example.com/docs',
		});
		await executeTool(compiled, 'search_web', {
			query: 'example',
		});

		const fetchMock = env.web.fetch as ReturnType<typeof vi.fn>;
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				url: 'https://example.com/docs',
				timeoutMs: 1234,
				maxRedirects: 2,
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				url: 'https://mcp.exa.ai/mcp',
				timeoutMs: 4321,
				maxRedirects: 7,
			}),
		);
	});
});
