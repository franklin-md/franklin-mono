import { describe, it, expect, vi } from 'vitest';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
} from '@franklin/mini-acp';
import type {
	CoreState,
	StoreState,
	EnvironmentState,
	EnvironmentFactory,
	Persister,
	StoreSnapshot,
} from '@franklin/extensions';
import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
} from '@franklin/extensions';
import { SessionManager } from '../agent/session/index.js';
import { SessionRegistry } from '../agent/session/registry.js';
import type { SessionSnapshot } from '../agent/session/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
		const connection = createAgentConnection(agentSide);

		const adapter = createSessionAdapter(
			(_ctx) => ({
				async *prompt() {
					yield {
						type: 'turnEnd' as const,
						stopCode: StopCode.Finished,
					};
				},
				async cancel() {},
			}),
			connection.remote,
		);
		connection.bind(adapter);

		return {
			...clientSide,
			dispose: async () => {
				await clientSide.close();
			},
		};
	};
}

function mockEnvironmentFactory(): EnvironmentFactory {
	return async (config) => ({
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
		config: vi.fn(async () => ({ ...config })),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	});
}

type TestState = CoreState & StoreState & EnvironmentState;

function mockPersister<T>(): Persister<T> & { _store: Map<string, T> } {
	const store = new Map<string, T>();
	return {
		_store: store,
		save: vi.fn(async (key: string, value: T) => {
			store.set(key, value);
		}),
		load: vi.fn(async () => new Map(store)),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
	};
}

function createTestSetup(opts?: {
	sessionPersister?: Persister<SessionSnapshot<TestState>>;
	storePersister?: Persister<StoreSnapshot>;
}) {
	const spawn = createMockSpawn();
	const storeRegistry = new StoreRegistry(opts?.storePersister);

	const system = systems(createCoreSystem(spawn))
		.add(createStoreSystem(storeRegistry))
		.add(createEnvironmentSystem(mockEnvironmentFactory()))
		.done();

	const sessionRegistry = new SessionRegistry(opts?.sessionPersister);

	const manager = new SessionManager(sessionRegistry, system, []);

	return { manager, storeRegistry, sessionRegistry, system };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionManager.restore', () => {
	it('restores sessions from persisted snapshots', async () => {
		const sessionPersister = mockPersister<SessionSnapshot<TestState>>();
		const { manager } = createTestSetup({ sessionPersister });

		// Create a session so a snapshot is persisted
		const session = await manager.new({
			env: {
				fsConfig: {
					cwd: '/test',
					permissions: { allowRead: ['**'], allowWrite: [] },
				},
				netConfig: { allowedDomains: [], deniedDomains: [] },
			},
		});
		const originalId = session.sessionId;

		// Build a fresh manager with the same persister (simulating restart)
		const { manager: restored } = createTestSetup({ sessionPersister });

		expect(restored.list()).toHaveLength(0);
		await restored.restore();
		expect(restored.list()).toHaveLength(1);

		const restoredSession = restored.list()[0]!;
		expect(restoredSession.sessionId).toBe(originalId);
		expect(restoredSession.runtime.state).toBeDefined();
	});

	it('is a no-op when no persister is configured', async () => {
		const { manager } = createTestSetup();

		await expect(manager.restore()).resolves.toBeUndefined();
		expect(manager.list()).toHaveLength(0);
	});

	it('restored sessions have working runtimes', async () => {
		const sessionPersister = mockPersister<SessionSnapshot<TestState>>();
		const { manager } = createTestSetup({ sessionPersister });

		await manager.new({
			env: {
				fsConfig: {
					cwd: '/test',
					permissions: { allowRead: ['**'], allowWrite: [] },
				},
				netConfig: { allowedDomains: [], deniedDomains: [] },
			},
		});

		const { manager: restored } = createTestSetup({ sessionPersister });
		await restored.restore();

		const session = restored.list()[0]!;
		const state = await session.runtime.state();
		expect(state.core).toBeDefined();
		expect(state.store).toBeDefined();
		expect(state.env).toBeDefined();
	});
});

describe('App-level restore orchestration', () => {
	it('restores stores before sessions', async () => {
		const callOrder: string[] = [];

		const storePersister = mockPersister<StoreSnapshot>();
		const sessionPersister = mockPersister<SessionSnapshot<TestState>>();

		// Spy on load to track call order
		storePersister.load = vi.fn(() => {
			callOrder.push('store');
			return Promise.resolve(new Map(storePersister._store));
		});
		sessionPersister.load = vi.fn(() => {
			callOrder.push('session');
			return Promise.resolve(new Map(sessionPersister._store));
		});

		const { manager, storeRegistry } = createTestSetup({
			sessionPersister,
			storePersister,
		});

		// Simulate the app-level restore pattern:
		// storeRegistry.restore() first, then manager.restore()
		await storeRegistry.restore();
		await manager.restore();

		expect(callOrder).toEqual(['store', 'session']);
	});
});
