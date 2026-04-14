import { describe, it, expect, vi } from 'vitest';
import { compile, combine } from '../../types.js';
import { createEnvironmentCompiler } from '../compiler.js';
import { createCoreCompiler } from '../../core/compiler.js';
import { createStoreCompiler } from '../../store/compiler.js';
import { createEmptyStoreResult } from '../../../api/store/registry/result.js';
import type { ReconfigurableEnvironment } from '../../../api/environment/types.js';
import { StoreRegistry } from '../../../api/store/registry/index.js';

function mockEnvironment(): ReconfigurableEnvironment {
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
			resolve: vi.fn(async (...paths: string[]) => paths[paths.length - 1]!),
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

describe('createEnvironmentCompiler', () => {
	it('build returns the environment in the result', async () => {
		const env = mockEnvironment();
		const result = await compile(createEnvironmentCompiler(env), () => {});

		expect(result.environment.filesystem).toBe(env.filesystem);
		expect(await result.environment.config()).toEqual(await env.config());
	});

	it('getEnvironment() returns the environment to extensions', async () => {
		const env = mockEnvironment();
		let received: ReconfigurableEnvironment | undefined;

		await compile(createEnvironmentCompiler(env), (api) => {
			received = api.getEnvironment();
		});

		expect(received).toBe(env);
	});

	it('combines with core compiler', async () => {
		const env = mockEnvironment();
		const compiler = combine(
			createCoreCompiler(),
			createEnvironmentCompiler(env),
		);

		const result = await compile(compiler, (api) => {
			// Extension sees both CoreAPI and EnvironmentAPI
			expect(api.getEnvironment()).toBe(env);
			api.on('initialize', () => undefined);
		});

		expect(result.environment.filesystem).toBe(env.filesystem);
		expect(result.client).toBeDefined();
	});

	it('combines with core + store compilers', async () => {
		const env = mockEnvironment();
		const registry = new StoreRegistry();
		const seed = createEmptyStoreResult(registry);
		const compiler = combine(
			combine(createCoreCompiler(), createStoreCompiler(seed)),
			createEnvironmentCompiler(env),
		);

		const result = await compile(compiler, (api) => {
			const full = api;
			expect(full.getEnvironment()).toBe(env);
			full.registerStore('test', 42, 'private');
		});

		expect(result.environment.filesystem).toBe(env.filesystem);
		expect(result.stores.has('test')).toBe(true);
	});
});
