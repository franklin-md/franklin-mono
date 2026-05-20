import { describe, expect, it, vi } from 'vitest';

import type { BaseRuntime } from '@franklin/extensibility';
import {
	RuntimeCollection,
	type RuntimeEntry,
} from '../modules/orchestrator/index.js';

import { createSessionPersistence } from '../app/session/index.js';
import type { SessionPersistence } from '../storage/types.js';

type TestSession = {
	value: number;
};

type TestRuntime = BaseRuntime;

function createRuntime(session: TestSession): {
	runtime: TestRuntime;
	getSession: () => Promise<TestSession>;
} {
	const runtime: TestRuntime = {
		dispose: vi.fn(async () => {}),
	};
	const getSession = vi.fn(async () => ({ ...session }));

	return { runtime, getSession };
}

function createPersistedSessions(): SessionPersistence<TestSession> {
	return {
		save: vi.fn(async () => {}),
		load: vi.fn(async () => ({ values: new Map(), issues: [] })),
		delete: vi.fn(async () => {}),
	};
}

function createObserver() {
	const listeners = new Map<TestRuntime, () => void>();
	const observe = vi.fn((runtime: TestRuntime, listener: () => void) => {
		listeners.set(runtime, listener);
		return () => {
			listeners.delete(runtime);
		};
	});
	const notify = (runtime: TestRuntime) => {
		listeners.get(runtime)?.();
	};

	return { observe, notify };
}

describe('createSessionPersistence', () => {
	it('persists initial session and injected runtime observer changes', async () => {
		const session = { value: 1 };
		const { runtime, getSession } = createRuntime(session);
		const persistedSessions = createPersistedSessions();
		const collection = new RuntimeCollection<TestRuntime>();
		const { observe, notify } = createObserver();
		createSessionPersistence<TestSession, TestRuntime>({
			collection,
			persistedSessions,
			getSession,
			observeSessionChanges: observe,
		});

		collection.set('root', runtime);

		await vi.waitFor(() => {
			expect(persistedSessions.save).toHaveBeenCalledWith('root', {
				value: 1,
			});
		});
		expect(observe).toHaveBeenCalledWith(runtime, expect.any(Function));

		vi.mocked(persistedSessions.save).mockClear();
		session.value = 2;
		notify(runtime);

		await vi.waitFor(() => {
			expect(persistedSessions.save).toHaveBeenCalledWith('root', {
				value: 2,
			});
		});
	});

	it('unsubscribes runtime observers when a runtime is removed', async () => {
		const { runtime, getSession } = createRuntime({ value: 1 });
		const persistedSessions = createPersistedSessions();
		const collection = new RuntimeCollection<TestRuntime>();
		const { observe, notify } = createObserver();
		createSessionPersistence<TestSession, TestRuntime>({
			collection,
			persistedSessions,
			getSession,
			observeSessionChanges: observe,
		});

		collection.set('root', runtime);
		await vi.waitFor(() => {
			expect(persistedSessions.save).toHaveBeenCalledOnce();
		});

		vi.mocked(persistedSessions.save).mockClear();
		await collection.remove('root');
		notify(runtime);

		expect(persistedSessions.save).not.toHaveBeenCalled();
		expect(persistedSessions.delete).toHaveBeenCalledWith('root');
	});

	it('restores persisted entries through the supplied hydrate callback', async () => {
		const persistedSessions = createPersistedSessions();
		const collection = new RuntimeCollection<TestRuntime>();
		const { observe } = createObserver();
		const persistence = createSessionPersistence<TestSession, TestRuntime>({
			collection,
			persistedSessions,
			getSession: vi.fn(async () => ({ value: 0 })),
			observeSessionChanges: observe,
		});
		vi.mocked(persistedSessions.load).mockResolvedValueOnce({
			values: new Map([['root', { value: 5 }]]),
			issues: [],
		});
		const hydrate = vi.fn(
			async (
				id: string,
				session: TestSession,
			): Promise<RuntimeEntry<TestRuntime>> => {
				const { runtime } = createRuntime(session);
				return { id, runtime };
			},
		);

		await persistence.restore(hydrate);

		expect(hydrate).toHaveBeenCalledWith('root', { value: 5 });
	});
});
