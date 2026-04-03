import { describe, it, expect, vi } from 'vitest';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import {
	createSessionAdapter,
	createAgentConnection,
} from '@franklin/mini-acp';
import type {
	Environment,
	EnvironmentConfig,
	EnvironmentFactory,
} from '@franklin/extensions';
import {
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	combineSystems,
	StorePool as StoreRegistry,
} from '@franklin/extensions';
import { SessionManager } from '../agent/session/index.js';
import type { IAuthManager } from '../auth/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthManager(): IAuthManager {
	return {
		load: vi.fn(async () => ({})),
		getApiKey: vi.fn(async () => undefined),
		onAuthChange: vi.fn(() => () => {}),
	} as unknown as IAuthManager;
}

function mockEnvironment(config: EnvironmentConfig): Environment {
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
		config: vi.fn(async () => ({ ...config })),
		reconfigure: vi.fn(async () => {}),
	};
}

function mockEnvironmentFactory(): {
	factory: EnvironmentFactory;
	created: Array<{ config: EnvironmentConfig; env: Environment }>;
} {
	const created: Array<{ config: EnvironmentConfig; env: Environment }> = [];
	const factory: EnvironmentFactory = async (config) => {
		const env = mockEnvironment(config);
		created.push({ config, env });
		return { ...env, dispose: vi.fn(async () => {}) };
	};
	return { factory, created };
}

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();

		const adapter = createSessionAdapter((_ctx) => ({
			async *prompt() {
				yield {
					type: 'turnEnd' as const,
					stopReason: 'end_turn' as const,
				};
			},
			async cancel() {},
		}));
		const { bind } = createAgentConnection(agentSide);
		bind(adapter);

		return {
			...clientSide,
			dispose: async () => {
				await clientSide.close();
			},
		};
	};
}

function createTestManager(envFactory: EnvironmentFactory) {
	const spawn = createMockSpawn();
	const registry = new StoreRegistry();

	const system = combineSystems(
		createCoreSystem(spawn),
		combineSystems(
			createStoreSystem(registry),
			createEnvironmentSystem(envFactory),
		),
	);

	return new SessionManager(system, [], mockAuthManager(), registry);
}

const defaultConfig: EnvironmentConfig = {
	cwd: '/project',
	permissions: { allowRead: ['**'], allowWrite: ['**'] },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionManager — environment wiring', () => {
	it('new() calls the environment factory with the provided config', async () => {
		const { factory, created } = mockEnvironmentFactory();
		const manager = createTestManager(factory);

		await manager.new({ env: defaultConfig });

		expect(created).toHaveLength(1);
		expect(created[0]!.config).toEqual(defaultConfig);
	});

	it('session exposes the created environment via runtime', async () => {
		const { factory } = mockEnvironmentFactory();
		const manager = createTestManager(factory);

		const session = await manager.new({ env: defaultConfig });

		expect(session.runtime.environment).toBeDefined();
		expect(session.runtime.environment.filesystem).toBeDefined();
		const envConfig = await session.runtime.environment.config();
		expect(envConfig).toEqual(defaultConfig);
	});

	it('fork inherits the parent environment config', async () => {
		const { factory, created } = mockEnvironmentFactory();
		const manager = createTestManager(factory);

		const parent = await manager.new({ env: defaultConfig });
		await manager.fork(parent.sessionId);

		expect(created).toHaveLength(2);
		expect(created[1]!.config).toEqual(defaultConfig);
	});

	it('child inherits the parent environment config', async () => {
		const { factory, created } = mockEnvironmentFactory();
		const manager = createTestManager(factory);

		const parent = await manager.new({ env: defaultConfig });
		await manager.child(parent.sessionId);

		expect(created).toHaveLength(2);
		expect(created[1]!.config).toEqual(defaultConfig);
	});

	it('runtime.state() captures environment config', async () => {
		const { factory } = mockEnvironmentFactory();
		const manager = createTestManager(factory);

		const session = await manager.new({ env: defaultConfig });
		const state = await session.runtime.state();

		expect(state.env).toEqual(defaultConfig);
	});
});
