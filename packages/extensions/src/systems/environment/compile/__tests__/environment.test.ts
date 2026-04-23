import { describe, it, expect, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { compile } from '../../../../algebra/compiler/compile.js';
import { combine } from '../../../../algebra/compiler/combine.js';
import { createEnvironmentCompiler } from '../compiler.js';
import { createStoreCompiler } from '../../../store/compile/compiler.js';
import { StoreRegistry } from '../../../store/api/registry/index.js';
import { emptyEnvironmentState } from '../../state.js';
import type { ReconfigurableEnvironment } from '../../api/types.js';

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
			resolve: vi.fn(
				async (...paths: string[]) => paths[paths.length - 1]! as AbsolutePath,
			),
		},
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
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

describe('createEnvironmentCompiler', () => {
	it('build returns a runtime that exposes the environment', async () => {
		const env = mockEnvironment();
		const result = await compile(
			createEnvironmentCompiler(env),
			() => {},
			emptyEnvironmentState(),
		);

		expect(result.environment.filesystem).toBe(env.filesystem);
		expect(await result.environment.config()).toEqual(await env.config());
	});

	it('combines with a store compiler', async () => {
		const env = mockEnvironment();
		const compiler = combine(
			createEnvironmentCompiler(env),
			createStoreCompiler(new StoreRegistry()),
		);

		const result = await compile(
			compiler,
			(api) => {
				api.registerStore('test', 42, 'private');
			},
			{ ...emptyEnvironmentState(), store: {} },
		);

		expect(result.environment.filesystem).toBe(env.filesystem);
		expect(result.getStore<number>('test').get()).toBe(42);
	});
});
