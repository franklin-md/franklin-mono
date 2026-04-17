import type { AbsolutePath } from '@franklin/lib';
import type { MiniACPClient } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { compile } from '../../../algebra/compiler/compile.js';
import { combine } from '../../../algebra/compiler/combine.js';
import { apply } from '@franklin/lib/middleware';
import { createCoreCompiler } from '../../../systems/core/compile/compiler.js';
import { createEnvironmentCompiler } from '../../../systems/environment/compile/compiler.js';
import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import {
	StoreRegistry,
	createEmptyStoreResult,
} from '../../../systems/store/api/index.js';
import { createStoreCompiler } from '../../../systems/store/compile/compiler.js';
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

async function executeTool(
	result: Awaited<ReturnType<typeof compileWeb>>,
	name: string,
	args: Record<string, unknown>,
) {
	return result.server.toolExecute(
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

function compileWeb(env: ReconfigurableEnvironment) {
	const compiler = combine(
		combine(
			createCoreCompiler(),
			createStoreCompiler(createEmptyStoreResult(new StoreRegistry())),
		),
		createEnvironmentCompiler(env),
	);
	return compile(
		compiler,
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
		const result = await compileWeb(env);

		expect(bundle.keys.cache).toBe(webFetchCacheKey);
		expect(bundle.tools.fetchUrl.name).toBe('fetch_url');
		expect(bundle.tools.searchWeb.name).toBe('search_web');

		const received: Array<Parameters<MiniACPClient['setContext']>[0]> = [];
		const target: MiniACPClient = {
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(
				async (params: Parameters<MiniACPClient['setContext']>[0]) => {
					received.push(params);
				},
			),
			prompt: vi.fn(async function* () {
				yield* [];
			}),
			cancel: vi.fn(async () => {}),
		};

		await apply(result.client, target).setContext({});

		const names = (received[0] as { tools: Array<{ name: string }> }).tools.map(
			(tool) => tool.name,
		);
		expect(names).toEqual(expect.arrayContaining(['fetch_url', 'search_web']));

		await executeTool(result, 'fetch_url', {
			url: 'https://example.com/docs',
		});
		await executeTool(result, 'search_web', {
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
