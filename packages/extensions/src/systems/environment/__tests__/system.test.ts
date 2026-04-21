import { describe, it, expect, vi } from 'vitest';
import { FILESYSTEM_ALLOW_ALL, type AbsolutePath } from '@franklin/lib';
import { createEnvironmentSystem } from '../system.js';
import { createRuntime } from '../../../algebra/system/create.js';
import type {
	ReconfigurableEnvironment,
	EnvironmentConfig,
} from '../api/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function mockEnvironment(config: EnvironmentConfig): ReconfigurableEnvironment {
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
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		config: vi.fn(async () => ({ ...config })),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function mockFactory() {
	const disposes: ReturnType<typeof vi.fn>[] = [];
	const factory = async (config: EnvironmentConfig) => {
		const env = mockEnvironment(config);
		disposes.push(env.dispose as ReturnType<typeof vi.fn>);
		return env;
	};
	return { factory, disposes };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createEnvironmentSystem', () => {
	it('create returns a runtime with the environment', async () => {
		const { factory } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const runtime = await createRuntime(system, { env: defaultConfig }, []);

		expect(runtime.environment).toBeDefined();
		expect(runtime.environment.filesystem).toBeDefined();
	});

	it('runtime exposes the environment to handlers', async () => {
		const { factory } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const runtime = await createRuntime(system, { env: defaultConfig }, []);
		expect(runtime.environment.filesystem).toBeDefined();
	});

	it('state returns the environment config', async () => {
		const { factory } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const runtime = await createRuntime(system, { env: defaultConfig }, []);

		expect(await runtime.state.get()).toEqual({ env: defaultConfig });
	});

	it('fork returns a clone of the keyed config', async () => {
		const { factory } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const runtime = await createRuntime(system, { env: defaultConfig }, []);
		const forked = await runtime.state.fork();

		expect(forked).toEqual({ env: defaultConfig });
		expect(forked.env).not.toBe((await runtime.state.get()).env);
	});

	it('child returns a clone of the keyed config', async () => {
		const { factory } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const runtime = await createRuntime(system, { env: defaultConfig }, []);
		const childState = await runtime.state.child();

		expect(childState).toEqual({ env: defaultConfig });
		expect(childState.env).not.toBe((await runtime.state.get()).env);
	});

	it('dispose calls the environment disposable', async () => {
		const { factory, disposes } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const runtime = await createRuntime(system, { env: defaultConfig }, []);
		await runtime.dispose();

		expect(disposes[0]).toHaveBeenCalledOnce();
	});

	it('emptyState returns a default config', () => {
		const { factory } = mockFactory();
		const system = createEnvironmentSystem(factory);

		const empty = system.emptyState();
		expect(empty.env).toBeDefined();
		expect(empty.env.fsConfig.cwd).toBeDefined();
	});
});
