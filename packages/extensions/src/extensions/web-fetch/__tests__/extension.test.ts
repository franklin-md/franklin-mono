import { describe, expect, it, vi } from 'vitest';
import { createCoreCompiler } from '../../../compile/core/compiler.js';
import { createEnvironmentCompiler } from '../../../compile/environment/compiler.js';
import { createStoreCompiler } from '../../../compile/store/compiler.js';
import { compile, combine } from '../../../compile/types.js';
import { StoreRegistry, createEmptyStoreResult } from '../../../api/store/index.js';
import type { Environment } from '../../../api/environment/types.js';
import { webFetchExtension } from '../extension.js';

function mockEnvironment(): Environment & { dispose(): Promise<void> } {
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
		web: { fetch: vi.fn() },
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

async function compileWebFetch(env: Environment & { dispose(): Promise<void> }) {
	const compiler = combine(
		combine(
			createCoreCompiler(),
			createStoreCompiler(createEmptyStoreResult(new StoreRegistry())),
		),
		createEnvironmentCompiler(env),
	);
	return compile(compiler, webFetchExtension());
}

describe('webFetchExtension', () => {
	it('forwards maxResponseBytes to the environment fetch call', async () => {
		const env = mockEnvironment();
		const webFetch = vi.mocked(env.web.fetch);
		webFetch.mockResolvedValue({
			requestedUrl: 'https://example.com/',
			finalUrl: 'https://example.com/',
			status: 200,
			statusText: 'OK',
			contentType: 'text/plain',
			kind: 'text',
			text: 'hello world',
			truncated: false,
			isError: false,
			cacheable: true,
		});

		const result = await compileWebFetch(env);

		await result.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c1',
					name: 'fetch_url',
					arguments: {
						url: 'https://example.com/',
						maxResponseBytes: 1234,
					},
				},
			},
			vi.fn(),
		);

		expect(webFetch).toHaveBeenCalledWith({
			url: 'https://example.com/',
			timeoutMs: 8000,
			maxResponseBytes: 1234,
			maxRedirects: 5,
		});
	});
});
