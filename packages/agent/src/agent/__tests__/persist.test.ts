import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDuplexPair } from '@franklin/transport';
import {
	createAgentConnection,
	type MiniACPClient,
	type ClientProtocol,
	type AgentProtocol,
} from '@franklin/mini-acp';
import type { Extension, CoreAPI, StoreAPI } from '@franklin/extensions';
import { SessionManager } from '../session/index.js';
import type { Session } from '../session/types.js';
import { snapshotSession, hydrateStores } from '../session/persist/snapshot.js';
import { SessionMap } from '../session/persist/session-map.js';
import { createFilePersister } from '../session/persist/file-persister.js';
import type {
	Persister,
	SessionSnapshot,
	FileSystemOps,
} from '../session/persist/types.js';

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
			yield { type: 'turnEnd' as const };
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

function counterExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		api.registerStore<number>('counter', 0, 'private');
	};
}

function createMockFs(): FileSystemOps & {
	files: Map<string, string>;
} {
	const files = new Map<string, string>();
	return {
		files,
		readFile: async (path) => {
			const content = files.get(path);
			if (content === undefined) throw new Error(`ENOENT: ${path}`);
			return content;
		},
		writeFile: async (path, data) => {
			files.set(path, data);
		},
		readDir: async (path) => {
			const entries: string[] = [];
			for (const key of files.keys()) {
				if (key.startsWith(path + '/')) {
					entries.push(key.slice(path.length + 1));
				}
			}
			return entries;
		},
		deleteFile: async (path) => {
			files.delete(path);
		},
		mkdir: async () => {},
	};
}

function createMockPersister(): Persister & {
	saved: Map<string, SessionSnapshot>;
} {
	const saved = new Map<string, SessionSnapshot>();
	return {
		saved,
		async save(id, snapshot) {
			saved.set(id, snapshot);
		},
		async load() {
			return [...saved.values()];
		},
		async delete(id) {
			saved.delete(id);
		},
	};
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
		it('extracts sessionId, systemPrompt, messages, and stores', async () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);
			const session = track(
				await manager.new({ systemPrompt: 'You are helpful' }),
			);

			// Mutate the store
			session.agent.stores.stores.get('counter')!.store.set(() => 42);

			// Add some messages to the tracker
			session.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});

			const snapshot = snapshotSession(session);

			expect(snapshot.sessionId).toBe(session.sessionId);
			expect(snapshot.systemPrompt).toBe('You are helpful');
			expect(snapshot.messages).toHaveLength(1);
			expect(snapshot.messages[0]).toEqual({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			expect(snapshot.stores).toEqual({
				counter: { value: 42, sharing: 'private' },
			});
		});
	});

	// -----------------------------------------------------------------------
	// hydrateStores
	// -----------------------------------------------------------------------

	describe('hydrateStores', () => {
		it('rebuilds stores from snapshot data', () => {
			const result = hydrateStores({
				counter: { value: 10, sharing: 'private' },
				name: { value: 'test', sharing: 'global' },
			});

			expect(result.stores.size).toBe(2);

			const counter = result.stores.get('counter')!;
			expect(counter.store.get()).toBe(10);
			expect(counter.sharing).toBe('private');

			const name = result.stores.get('name')!;
			expect(name.store.get()).toBe('test');
			expect(name.sharing).toBe('global');
		});
	});

	// -----------------------------------------------------------------------
	// SessionMap
	// -----------------------------------------------------------------------

	describe('SessionMap', () => {
		it('eagerly persists on persist() call', async () => {
			const persister = createMockPersister();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);

			const session = track(await manager.new());

			expect(persister.saved.has(session.sessionId)).toBe(true);
			const snapshot = persister.saved.get(session.sessionId)!;
			expect(snapshot.stores.counter.value).toBe(0);
		});

		it('persists after fork', async () => {
			const persister = createMockPersister();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);

			const parent = track(await manager.new());
			parent.agent.stores.stores.get('counter')!.store.set(() => 7);

			const forked = track(await manager.fork(parent.sessionId));

			expect(persister.saved.has(forked.sessionId)).toBe(true);
			const snapshot = persister.saved.get(forked.sessionId)!;
			expect(snapshot.stores.counter.value).toBe(7);
		});

		it('persists after child', async () => {
			const persister = createMockPersister();
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);

			const parent = track(await manager.new());
			const child = track(await manager.child(parent.sessionId));

			expect(persister.saved.has(child.sessionId)).toBe(true);
		});

		it('persists after rewind', async () => {
			const persister = createMockPersister();
			const manager = new SessionManager(
				createTestTransport,
				[],
				persister,
			);

			const session = track(
				await manager.new({ systemPrompt: 'test' }),
			);
			session.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			session.tracker.append({
				role: 'assistant',
				content: [{ type: 'text', text: 'hi' }],
			});

			await manager.rewind(session.sessionId, 1);

			const snapshot = persister.saved.get(session.sessionId)!;
			expect(snapshot.messages).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// createFilePersister
	// -----------------------------------------------------------------------

	describe('createFilePersister', () => {
		it('saves and loads session snapshots', async () => {
			const mockFs = createMockFs();
			const persister = createFilePersister('/data/sessions', mockFs);

			const snapshot: SessionSnapshot = {
				sessionId: 'abc-123',
				systemPrompt: 'You are helpful',
				messages: [
					{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
				],
				stores: {
					counter: { value: 5, sharing: 'private' },
				},
			};

			await persister.save('abc-123', snapshot);

			// File should exist
			expect(mockFs.files.has('/data/sessions/abc-123.json')).toBe(true);

			// Load should return the snapshot
			const loaded = await persister.load();
			expect(loaded).toHaveLength(1);
			expect(loaded[0].sessionId).toBe('abc-123');
			expect(loaded[0].systemPrompt).toBe('You are helpful');
			expect(loaded[0].stores.counter.value).toBe(5);
		});

		it('returns empty array when directory does not exist', async () => {
			const mockFs = createMockFs();
			// Override readDir to throw ENOENT
			mockFs.readDir = async () => {
				throw new Error('ENOENT');
			};
			const persister = createFilePersister('/data/sessions', mockFs);

			const loaded = await persister.load();
			expect(loaded).toEqual([]);
		});

		it('delete removes the file', async () => {
			const mockFs = createMockFs();
			const persister = createFilePersister('/data/sessions', mockFs);

			const snapshot: SessionSnapshot = {
				sessionId: 'abc-123',
				systemPrompt: '',
				messages: [],
				stores: {},
			};

			await persister.save('abc-123', snapshot);
			expect(mockFs.files.has('/data/sessions/abc-123.json')).toBe(true);

			await persister.delete('abc-123');
			expect(mockFs.files.has('/data/sessions/abc-123.json')).toBe(false);
		});

		it('delete does not throw when file is missing', async () => {
			const mockFs = createMockFs();
			const persister = createFilePersister('/data/sessions', mockFs);

			// Should not throw
			await persister.delete('nonexistent');
		});

		it('skips non-json files during load', async () => {
			const mockFs = createMockFs();
			const persister = createFilePersister('/data/sessions', mockFs);

			// Add a non-json file
			mockFs.files.set('/data/sessions/.DS_Store', 'junk');

			const snapshot: SessionSnapshot = {
				sessionId: 'abc-123',
				systemPrompt: '',
				messages: [],
				stores: {},
			};
			await persister.save('abc-123', snapshot);

			const loaded = await persister.load();
			expect(loaded).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// SessionManager.restore
	// -----------------------------------------------------------------------

	describe('SessionManager.restore', () => {
		it('restores sessions with correct state', async () => {
			const persister = createMockPersister();

			// Create a session and persist it
			const manager1 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);
			const session = track(
				await manager1.new({ systemPrompt: 'You are helpful' }),
			);

			// Mutate store and add messages
			session.agent.stores.stores.get('counter')!.store.set(() => 42);
			session.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});

			// Re-persist with updated state
			const snapshot = snapshotSession(session);
			await persister.save(session.sessionId, snapshot);

			// Create a new manager and restore
			const manager2 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);
			const restored = await manager2.restore();

			expect(restored).toHaveLength(1);
			const restoredSession = track(restored[0]);

			// Verify sessionId is preserved
			expect(restoredSession.sessionId).toBe(session.sessionId);

			// Verify context is restored
			const ctx = getCtx(restoredSession);
			expect(ctx.history.systemPrompt).toBe('You are helpful');
			expect(ctx.history.messages).toHaveLength(1);

			// Verify store value is restored
			const counter =
				restoredSession.agent.stores.stores.get('counter')!.store;
			expect(counter.get()).toBe(42);
		});

		it('restores multiple sessions', async () => {
			const persister = createMockPersister();

			const manager1 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);
			const s1 = track(await manager1.new({ systemPrompt: 'session 1' }));
			const s2 = track(await manager1.new({ systemPrompt: 'session 2' }));

			// Restore into a new manager
			const manager2 = new SessionManager(
				createTestTransport,
				[counterExtension()],
				persister,
			);
			const restored = await manager2.restore();

			expect(restored).toHaveLength(2);
			restored.forEach((s) => track(s));

			// Both sessions should be retrievable
			const r1 = manager2.get(s1.sessionId);
			const r2 = manager2.get(s2.sessionId);
			expect(getCtx(r1).history.systemPrompt).toBe('session 1');
			expect(getCtx(r2).history.systemPrompt).toBe('session 2');
		});

		it('returns empty array when no persister configured', async () => {
			const manager = new SessionManager(createTestTransport, []);
			const restored = await manager.restore();
			expect(restored).toEqual([]);
		});
	});
});
