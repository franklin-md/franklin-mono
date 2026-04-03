import { describe, it, expect, vi } from 'vitest';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
} from '@franklin/mini-acp';
import type { Environment, EnvironmentConfig } from '@franklin/extensions';
import { SessionManager } from '../agent/session/index.js';
import { snapshotSession } from '../agent/session/persist/snapshot.js';
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

type EnvironmentFactory = (
	config: EnvironmentConfig,
) => Promise<Environment & { dispose(): Promise<void> }>;

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

/**
 * Spawn function that creates an in-memory transport pair with a
 * no-op session adapter on the agent side. The client side is returned
 * as the "transport" the SessionManager will use.
 */
function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();

		const adapter = createSessionAdapter((_ctx) => ({
			async *prompt() {
				yield {
					type: 'turnEnd' as const,
					stopCode: StopCode.Finished,
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
		const manager = new SessionManager(
			createMockSpawn(),
			[],
			mockAuthManager(),
			factory,
		);

		await manager.new(undefined, defaultConfig);

		expect(created).toHaveLength(1);
		expect(created[0]!.config).toEqual(defaultConfig);
	});

	it('session exposes the created environment', async () => {
		const { factory } = mockEnvironmentFactory();
		const manager = new SessionManager(
			createMockSpawn(),
			[],
			mockAuthManager(),
			factory,
		);

		const session = await manager.new(undefined, defaultConfig);

		expect(session.environment).toBeDefined();
		expect(session.environment.filesystem).toBeDefined();
		const envConfig = await session.environment.config();
		expect(envConfig).toEqual(defaultConfig);
	});

	it('fork inherits the parent environment config', async () => {
		const { factory, created } = mockEnvironmentFactory();
		const manager = new SessionManager(
			createMockSpawn(),
			[],
			mockAuthManager(),
			factory,
		);

		const parent = await manager.new(undefined, defaultConfig);
		await manager.fork(parent.sessionId);

		expect(created).toHaveLength(2);
		// The child should have received the same config as the parent
		expect(created[1]!.config).toEqual(defaultConfig);
	});

	it('child inherits the parent environment config', async () => {
		const { factory, created } = mockEnvironmentFactory();
		const manager = new SessionManager(
			createMockSpawn(),
			[],
			mockAuthManager(),
			factory,
		);

		const parent = await manager.new(undefined, defaultConfig);
		await manager.child(parent.sessionId);

		expect(created).toHaveLength(2);
		expect(created[1]!.config).toEqual(defaultConfig);
	});

	it('snapshotSession captures environmentConfig from environment.config()', async () => {
		const { factory } = mockEnvironmentFactory();
		const manager = new SessionManager(
			createMockSpawn(),
			[],
			mockAuthManager(),
			factory,
		);

		const session = await manager.new(undefined, defaultConfig);
		const snapshot = await snapshotSession(session);

		expect(snapshot.environmentConfig).toEqual(defaultConfig);
	});
});
