import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDuplexPair } from '@franklin/transport';
import type { Persister } from '@franklin/lib';
import {
	createAgentConnection,
	type MiniACPClient,
	type ClientProtocol,
	type AgentProtocol,
} from '@franklin/mini-acp';
import {
	StorePool,
	type Extension,
	type CoreAPI,
	type StoreAPI,
	type StoreSnapshot,
} from '@franklin/extensions';
import type { IAuthManager } from '@franklin/auth';
import { mergeCtx, SessionManager } from '../session/index.js';

function mockAuthManager(): IAuthManager {
	return {
		load: async () => ({}),
		getEntry: async () => undefined,
		getApiKey: async () => undefined,
		setEntry: async () => {},
		removeEntry: async () => {},
		setApiKeyEntry: async () => {},
		removeApiKeyEntry: async () => {},
		setOAuthEntry: async () => {},
		removeOAuthEntry: async () => {},
		loginOAuth: async () => {},
		setApiKey: async () => {},
		onAuthChange: () => () => {},
	};
}

function createMutableAuthManager(
	initialKeys: Record<string, string | undefined> = {},
) {
	const keys = { ...initialKeys };

	const store: IAuthManager & {
		setKey(provider: string, key: string | undefined): void;
	} = {
		load: async () =>
			Object.fromEntries(
				Object.entries(keys)
					.filter(([, key]) => key !== undefined)
					.map(([provider, key]) => [
						provider,
						{ apiKey: { type: 'apiKey' as const, key: key! } },
					]),
			),
		getEntry: async (provider: string) => {
			const key = keys[provider];
			return key === undefined
				? undefined
				: {
						apiKey: { type: 'apiKey' as const, key },
					};
		},
		getApiKey: async (provider: string) => keys[provider],
		setEntry: async () => {},
		removeEntry: async () => {},
		setApiKeyEntry: async () => {},
		removeApiKeyEntry: async () => {},
		setOAuthEntry: async () => {},
		removeOAuthEntry: async () => {},
		loginOAuth: async () => {},
		setApiKey: async (provider: string, key: string) => {
			keys[provider] = key;
		},
		onAuthChange: () => () => {},
		setKey(provider: string, key: string | undefined) {
			keys[provider] = key;
		},
	};

	return store;
}
import type { Session } from '../session/types.js';
import { snapshotSession } from '../session/persist/snapshot.js';
import {
	createFileSessionPersister,
	createFilePoolPersister,
} from '../session/persist/file-persister.js';
import type { SessionSnapshot, Filesystem } from '../session/persist/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestTransport(): ClientProtocol {
	const { a, b } = createDuplexPair();
	const clientTransport = a as unknown as ClientProtocol;
	const agentTransport = b as unknown as AgentProtocol;

	const handlers: MiniACPClient = {
		async initialize() {
			return {};
		},
		async setContext() {
			return {};
		},
		async *prompt() {
			yield { type: 'turnEnd', stopReason: 'end_turn' as const };
		},
		async cancel() {
			return;
		},
	};

	createAgentConnection(agentTransport).bind(handlers);
	return clientTransport;
}

function getCtx(session: Session) {
	return session.tracker.get();
}

function setSystemPrompt(session: Session, systemPrompt: string) {
	const ctx = getCtx(session);
	session.tracker.apply(
		mergeCtx(ctx, {
			history: {
				systemPrompt,
				messages: ctx.history.messages,
			},
		}),
	);
}

function counterExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		api.registerStore<number>('counter', 0, 'private');
	};
}

function createMockFs(): Filesystem & {
	files: Map<string, string>;
} {
	const files = new Map<string, string>();
	return {
		files,
		readFile: async (path) => {
			const content = files.get(path);
			if (content === undefined) throw new Error(`ENOENT: ${path}`);
			return new TextEncoder().encode(content);
		},
		writeFile: async (path, data) => {
			files.set(
				path,
				typeof data === 'string' ? data : new TextDecoder().decode(data),
			);
		},
		access: async (path) => {
			if (!files.has(path)) throw new Error(`ENOENT: ${path}`);
		},
		stat: async () => ({
			isFile: () => true,
			isDirectory: () => false,
		}),
		readdir: async (path) => {
			const entries: string[] = [];
			for (const key of files.keys()) {
				if (key.startsWith(path + '/')) {
					entries.push(key.slice(path.length + 1));
				}
			}
			return entries;
		},
		exists: async (path) => files.has(path),
		glob: async () => [],
		deleteFile: async (path) => {
			files.delete(path);
		},
		mkdir: async () => undefined,
	};
}

function createMockPersister(): Persister<SessionSnapshot> & {
	saved: Map<string, SessionSnapshot>;
} {
	const saved = new Map<string, SessionSnapshot>();
	return {
		saved,
		async save(id, snapshot) {
			saved.set(id, snapshot);
		},
		async load() {
			return new Map(saved);
		},
		async delete(id) {
			saved.delete(id);
		},
	};
}

function createMockPoolPersister(): Persister<StoreSnapshot> & {
	savedStores: Map<string, StoreSnapshot>;
} {
	const savedStores = new Map<string, StoreSnapshot>();
	return {
		savedStores,
		async save(ref, data) {
			savedStores.set(ref, data);
		},
		async load() {
			return new Map(savedStores);
		},
		async delete(ref) {
			savedStores.delete(ref);
		},
	};
}

function createMockPersistence() {
	const session = createMockPersister();
	const pool = createMockPoolPersister();
	return { session, pool };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Persistence', () => {
	const disposables: { dispose: () => Promise<void> }[] = [];

	afterEach(async () => {
		for (const d of disposables) {
			await d.dispose().catch(() => {});
		}
		disposables.length = 0;
	});

	function track<T extends { agent: { dispose: () => Promise<void> } }>(
		session: T,
	): T {
		disposables.push(session.agent);
		return session;
	}

	// -----------------------------------------------------------------------
	// snapshotSession
	// -----------------------------------------------------------------------

	describe('snapshotSession', () => {
		it('extracts sessionId, ctx, and store refs', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);
			const session = track(await manager.new({}));
			setSystemPrompt(session, 'You are helpful');

			// Mutate the store
			session.agent.stores.get('counter')!.store.set(() => 42);

			// Add some messages to the tracker
			session.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			session.tracker.apply({
				config: { model: 'test-model', reasoning: 'high' },
			});

			const snapshot = snapshotSession(session);

			expect(snapshot.sessionId).toBe(session.sessionId);
			expect(snapshot.ctx.history.systemPrompt).toBe('You are helpful');
			expect(snapshot.ctx.history.messages).toHaveLength(1);
			expect(snapshot.ctx.history.messages[0]).toEqual({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			expect(snapshot.ctx.config).toEqual({
				model: 'test-model',
				reasoning: 'high',
			});
			// Session snapshot stores refs only; pool metadata lives separately.
			expect(snapshot.stores['counter']).toBeTypeOf('string');
		});
	});

	describe('StorePool (auto-persist)', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('persists newly created entries', async () => {
			const persister = createMockPoolPersister();
			const pool = new StorePool(persister);
			const { ref } = pool.create(1, 'private');

			await vi.advanceTimersByTimeAsync(0);

			const saved = persister.savedStores.get(ref)!;
			expect(saved.value).toBe(1);
			expect(saved.sharing).toBe('private');
			expect(saved.ref).toBe(ref);
		});

		it('persists direct store mutations without session tracker changes', async () => {
			const persister = createMockPoolPersister();
			const pool = new StorePool(persister);
			const { ref, store } = pool.create(1, 'private');

			store.set(() => 2);
			await vi.advanceTimersByTimeAsync(0);

			const saved = persister.savedStores.get(ref)!;
			expect(saved.value).toBe(2);
			expect(saved.sharing).toBe('private');
		});
	});

	// -----------------------------------------------------------------------
	// SessionMap
	// -----------------------------------------------------------------------

	describe('SessionMap (auto-persist)', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('auto-persists session and stores on creation', async () => {
			const persistence = createMockPersistence();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);

			const session = track(await manager.new({}));
			await vi.advanceTimersByTimeAsync(500);

			// Session snapshot saved
			expect(persistence.session.saved.has(session.sessionId)).toBe(true);
			const snapshot = persistence.session.saved.get(session.sessionId)!;
			expect(snapshot.stores['counter']).toBeDefined();

			// Store value saved separately via pool persister
			const ref = snapshot.stores['counter'];
			expect(persistence.pool.savedStores.has(ref!)).toBe(true);
			const savedStore = persistence.pool.savedStores.get(ref!);
			expect(savedStore).toBeDefined();
			expect(savedStore?.value).toBe(0);
		});

		it('auto-persists after fork', async () => {
			const persistence = createMockPersistence();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);

			const parent = track(await manager.new({}));
			parent.agent.stores.get('counter')!.store.set(() => 7);

			const forked = track(await manager.fork(parent.sessionId));
			await vi.advanceTimersByTimeAsync(500);

			expect(persistence.session.saved.has(forked.sessionId)).toBe(true);
			const snapshot = persistence.session.saved.get(forked.sessionId)!;
			const ref = snapshot.stores['counter']!;
			expect(persistence.pool.savedStores.get(ref)!.value).toBe(7);
		});

		it('auto-persists after child', async () => {
			const persistence = createMockPersistence();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);

			const parent = track(await manager.new({}));
			const child = track(await manager.child(parent.sessionId));
			await vi.advanceTimersByTimeAsync(500);

			expect(persistence.session.saved.has(child.sessionId)).toBe(true);
		});

		it('remove deletes session from list and persistence', async () => {
			const persistence = createMockPersistence();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);

			const session = track(await manager.new({}));
			await vi.advanceTimersByTimeAsync(500);

			// Verify session exists before removal
			expect(manager.list()).toHaveLength(1);
			expect(persistence.session.saved.has(session.sessionId)).toBe(true);

			// Track listener notifications
			const listener = vi.fn();
			manager.subscribe(listener);

			await manager.remove(session.sessionId);

			// Session gone from live list
			expect(manager.list()).toHaveLength(0);

			// Persisted snapshot deleted
			expect(persistence.session.saved.has(session.sessionId)).toBe(false);

			// Listeners notified
			expect(listener).toHaveBeenCalled();
		});

		it('remove is a no-op for unknown session IDs', async () => {
			const persistence = createMockPersistence();
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
				persistence,
			);

			// Should not throw
			await manager.remove('nonexistent');
		});

		it('auto-persists on tracker change (rewind)', async () => {
			const persistence = createMockPersistence();
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
				persistence,
			);

			const session = track(await manager.new({}));
			setSystemPrompt(session, 'test');
			session.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			session.tracker.append({
				role: 'assistant',
				content: [{ type: 'text', text: 'hi' }],
			});

			await manager.rewind(session.sessionId, 1);
			await vi.advanceTimersByTimeAsync(500);

			const snapshot = persistence.session.saved.get(session.sessionId)!;
			expect(snapshot.ctx.history.messages).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// createFileSessionPersister
	// -----------------------------------------------------------------------

	describe('createFileSessionPersister', () => {
		it('saves and loads session snapshots', async () => {
			const mockFs = createMockFs();
			const persister = createFileSessionPersister('/data', mockFs);

			const snapshot: SessionSnapshot = {
				sessionId: 'abc-123',
				ctx: {
					history: {
						systemPrompt: 'You are helpful',
						messages: [
							{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
						],
					},
				},
				stores: {
					counter: 'pool-1',
				},
			};

			await persister.save('abc-123', snapshot);

			// File should exist in sessions subdirectory
			expect(mockFs.files.has('/data/sessions/abc-123.json')).toBe(true);

			// Load should return the snapshot
			const loaded = await persister.load();
			expect(loaded.size).toBe(1);
			expect(loaded.get('abc-123')!.sessionId).toBe('abc-123');
			expect(loaded.get('abc-123')!.ctx.history.systemPrompt).toBe(
				'You are helpful',
			);
			expect(loaded.get('abc-123')!.stores['counter']).toBe('pool-1');
		});

		it('returns an empty map when sessions directory does not exist', async () => {
			const mockFs = createMockFs();
			// Override readdir to throw ENOENT
			mockFs.readdir = async () => {
				throw new Error('ENOENT');
			};
			const persister = createFileSessionPersister('/data', mockFs);

			const loaded = await persister.load();
			expect(loaded).toEqual(new Map());
		});

		it('delete removes the session file', async () => {
			const mockFs = createMockFs();
			const persister = createFileSessionPersister('/data', mockFs);

			const snapshot: SessionSnapshot = {
				sessionId: 'abc-123',
				ctx: {
					history: {
						systemPrompt: '',
						messages: [],
					},
				},
				stores: {},
			};

			await persister.save('abc-123', snapshot);
			expect(mockFs.files.has('/data/sessions/abc-123.json')).toBe(true);

			await persister.delete('abc-123');
			expect(mockFs.files.has('/data/sessions/abc-123.json')).toBe(false);
		});

		it('delete does not throw when file is missing', async () => {
			const mockFs = createMockFs();
			const persister = createFileSessionPersister('/data', mockFs);

			// Should not throw
			await persister.delete('nonexistent');
		});

		it('skips non-json files during load', async () => {
			const mockFs = createMockFs();
			const persister = createFileSessionPersister('/data', mockFs);

			// Add a non-json file
			mockFs.files.set('/data/sessions/.DS_Store', 'junk');

			const snapshot: SessionSnapshot = {
				sessionId: 'abc-123',
				ctx: {
					history: {
						systemPrompt: '',
						messages: [],
					},
				},
				stores: {},
			};
			await persister.save('abc-123', snapshot);

			const loaded = await persister.load();
			expect(loaded.size).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// createFilePoolPersister
	// -----------------------------------------------------------------------

	describe('createFilePoolPersister', () => {
		it('saves and loads store pool entries', async () => {
			const mockFs = createMockFs();
			const persister = createFilePoolPersister('/data', mockFs);

			await persister.save('pool-1', {
				ref: 'pool-1',
				value: 42,
				sharing: 'private',
			});
			await persister.save('pool-2', {
				ref: 'pool-2',
				value: 'hello',
				sharing: 'shared',
			});

			// Files should exist in store subdirectory
			expect(mockFs.files.has('/data/store/pool-1.json')).toBe(true);
			expect(mockFs.files.has('/data/store/pool-2.json')).toBe(true);

			// Load all stores
			const stores = await persister.load();
			expect(stores.get('pool-1')!.value).toBe(42);
			expect(stores.get('pool-1')!.sharing).toBe('private');
			expect(stores.get('pool-2')!.value).toBe('hello');
			expect(stores.get('pool-2')!.sharing).toBe('shared');
		});

		it('deletes store files', async () => {
			const mockFs = createMockFs();
			const persister = createFilePoolPersister('/data', mockFs);

			await persister.save('pool-1', {
				ref: 'pool-1',
				value: 0,
				sharing: 'private',
			});
			expect(mockFs.files.has('/data/store/pool-1.json')).toBe(true);

			await persister.delete('pool-1');
			expect(mockFs.files.has('/data/store/pool-1.json')).toBe(false);
		});

		it('returns an empty map when the store directory does not exist', async () => {
			const mockFs = createMockFs();
			mockFs.readdir = async () => {
				throw new Error('ENOENT');
			};
			const persister = createFilePoolPersister('/data', mockFs);

			const stores = await persister.load();
			expect(stores).toEqual(new Map());
		});
	});

	// -----------------------------------------------------------------------
	// SessionManager.restore
	// -----------------------------------------------------------------------

	describe('SessionManager.restore', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('restores sessions with correct state', async () => {
			const persistence = createMockPersistence();

			// Create a session and persist it
			const manager1 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);
			const session = track(await manager1.new({}));
			setSystemPrompt(session, 'You are helpful');

			// Mutate store and add messages
			session.agent.stores.get('counter')!.store.set(() => 42);
			session.tracker.apply({
				config: { model: 'test-model', reasoning: 'high' },
			});
			session.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});

			// Flush debounced saves for both the session snapshot and pool entry
			await vi.advanceTimersByTimeAsync(500);

			// Create a new manager and restore
			const manager2 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);
			await manager2.restore();
			const restoredSession = track(manager2.get(session.sessionId));

			// Verify sessionId is preserved
			expect(restoredSession.sessionId).toBe(session.sessionId);

			// Verify context is restored
			const ctx = getCtx(restoredSession);
			expect(ctx.history.systemPrompt).toBe('You are helpful');
			expect(ctx.history.messages).toHaveLength(1);
			expect(ctx.config).toEqual({
				model: 'test-model',
				reasoning: 'high',
			});

			// Verify store value is restored
			const counter = restoredSession.agent.stores.get('counter')!.store;
			expect(counter.get()).toBe(42);
		});

		it('restores multiple sessions', async () => {
			const persistence = createMockPersistence();

			const manager1 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);
			const s1 = track(await manager1.new({}));
			const s2 = track(await manager1.new({}));
			setSystemPrompt(s1, 'session 1');
			setSystemPrompt(s2, 'session 2');
			await vi.advanceTimersByTimeAsync(500);

			// Restore into a new manager
			const manager2 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
				persistence,
			);
			await manager2.restore();

			// Both sessions should be retrievable
			const r1 = manager2.get(s1.sessionId);
			const r2 = manager2.get(s2.sessionId);
			expect(getCtx(r1).history.systemPrompt).toBe('session 1');
			expect(getCtx(r2).history.systemPrompt).toBe('session 2');
		});

		it('restores config from defaults and refreshes apiKey from auth', async () => {
			const persistence = createMockPersistence();
			const authStore = createMutableAuthManager({ anthropic: 'sk-fresh' });

			persistence.session.saved.set('restored-session', {
				sessionId: 'restored-session',
				ctx: {
					history: {
						systemPrompt: 'restored prompt',
						messages: [],
					},
					config: {
						reasoning: 'high',
					},
				},
				stores: {},
			});

			const manager = new SessionManager(
				createTestTransport,
				[],
				authStore,
				persistence,
				{
					provider: 'anthropic',
					model: 'claude-opus-4-6',
				},
			);

			await manager.restore();
			const session = track(manager.get('restored-session'));

			expect(getCtx(session).config).toEqual({
				provider: 'anthropic',
				model: 'claude-opus-4-6',
				reasoning: 'high',
				apiKey: 'sk-fresh',
			});
		});

		it('is a no-op when no persister configured', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
			);
			await expect(manager.restore()).resolves.toBeUndefined();
		});

		it('shared stores maintain identity across restore', async () => {
			const persistence = createMockPersistence();

			// Create two sessions that share an inherited store
			const globalExt: Extension<CoreAPI & StoreAPI> = (api) => {
				api.registerStore<number>('shared', 0, 'shared');
			};

			const manager1 = new SessionManager(
				createTestTransport,
				[globalExt],
				mockAuthManager(),
				persistence,
			);
			const s1 = track(await manager1.new({}));
			const s2 = track(await manager1.child(s1.sessionId));

			// Verify they share the same store pre-restore
			const s1Store = s1.agent.stores.get('shared')!;
			const s2Store = s2.agent.stores.get('shared')!;
			expect(s1Store.ref).toBe(s2Store.ref);
			expect(s1Store.store).toBe(s2Store.store);

			// Mutate the shared store and flush debounced pool persistence
			s1Store.store.set(() => 42);
			await vi.advanceTimersByTimeAsync(500);

			// Restore into a new manager
			const manager2 = new SessionManager(
				createTestTransport,
				[globalExt],
				mockAuthManager(),
				persistence,
			);
			await manager2.restore();

			// Verify shared store identity is preserved across restore
			const r1 = track(manager2.get(s1.sessionId));
			const r2 = track(manager2.get(s2.sessionId));
			const r1Store = r1.agent.stores.get('shared')!;
			const r2Store = r2.agent.stores.get('shared')!;
			expect(r1Store.ref).toBe(r2Store.ref);
			expect(r1Store.store).toBe(r2Store.store);
			expect(r1Store.store.get()).toBe(42);
		});
	});
});
