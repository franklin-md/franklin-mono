import { describe, expect, it, vi } from 'vitest';
import type { BaseRuntime } from '@franklin/extensibility';

import type { RuntimeEvent } from '../modules/orchestrator/index.js';
import { createSessionPersistence } from '../app/session/index.js';
import type { SessionPersistenceSource } from '../app/session/persistence.js';
import type { SessionPersistence } from '../storage/types.js';

type TestSession = {
	value: number;
};

type TestRuntime = BaseRuntime & {
	readonly label: string;
};

function createRuntime(label: string): TestRuntime {
	return {
		label,
		dispose: vi.fn(async () => {}),
	};
}

function createPersistedSessions(): SessionPersistence<TestSession> {
	return {
		save: vi.fn(async () => {}),
		load: vi.fn(async () => ({ values: new Map(), issues: [] })),
		delete: vi.fn(async () => {}),
	};
}

function createSessionSource() {
	const sessions = new Map<string, TestSession>();
	const listeners = new Set<(event: RuntimeEvent<TestRuntime>) => void>();
	type Source = SessionPersistenceSource<TestSession, TestRuntime>;

	function emit(event: RuntimeEvent<TestRuntime>): void {
		for (const listener of listeners) listener(event);
	}

	const source: Source = {
		create: vi.fn<Source['create']>(async ({ id, state }) => {
			const runtime = createRuntime(id);
			sessions.set(id, { ...state });
			emit({ action: 'add', id, runtime });
			return runtime;
		}),
		getState: vi.fn<Source['getState']>(async (id) => {
			const session = sessions.get(id);
			return session ? { ...session } : undefined;
		}),
		subscribe: vi.fn<Source['subscribe']>((listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	const add = (id: string, runtime: TestRuntime, session: TestSession) => {
		sessions.set(id, { ...session });
		emit({ action: 'add', id, runtime });
	};
	const remove = (id: string, runtime: TestRuntime) => {
		sessions.delete(id);
		emit({ action: 'remove', id, runtime });
	};
	const update = (id: string, session: TestSession) => {
		sessions.set(id, { ...session });
	};

	return { source, add, remove, update };
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
		const runtime = createRuntime('root-runtime');
		const persistedSessions = createPersistedSessions();
		const sessionSource = createSessionSource();
		const { observe, notify } = createObserver();
		createSessionPersistence<TestSession, TestRuntime>({
			source: sessionSource.source,
			persistedSessions,
			observeSessionChanges: observe,
		});

		sessionSource.add('root', runtime, { value: 1 });

		await vi.waitFor(() => {
			expect(persistedSessions.save).toHaveBeenCalledWith('root', {
				value: 1,
			});
		});
		expect(observe).toHaveBeenCalledWith(runtime, expect.any(Function));

		vi.mocked(persistedSessions.save).mockClear();
		sessionSource.update('root', { value: 2 });
		notify(runtime);

		await vi.waitFor(() => {
			expect(persistedSessions.save).toHaveBeenCalledWith('root', {
				value: 2,
			});
		});
	});

	it('unsubscribes runtime observers when a runtime is removed', async () => {
		const runtime = createRuntime('root-runtime');
		const persistedSessions = createPersistedSessions();
		const sessionSource = createSessionSource();
		const { observe, notify } = createObserver();
		createSessionPersistence<TestSession, TestRuntime>({
			source: sessionSource.source,
			persistedSessions,
			observeSessionChanges: observe,
		});

		sessionSource.add('root', runtime, { value: 1 });
		await vi.waitFor(() => {
			expect(persistedSessions.save).toHaveBeenCalledOnce();
		});

		vi.mocked(persistedSessions.save).mockClear();
		sessionSource.remove('root', runtime);
		notify(runtime);

		expect(persistedSessions.save).not.toHaveBeenCalled();
		expect(persistedSessions.delete).toHaveBeenCalledWith('root');
	});

	it('restores persisted entries through the session source', async () => {
		const persistedSessions = createPersistedSessions();
		const sessionSource = createSessionSource();
		const { observe } = createObserver();
		const persistence = createSessionPersistence<TestSession, TestRuntime>({
			source: sessionSource.source,
			persistedSessions,
			observeSessionChanges: observe,
		});
		vi.mocked(persistedSessions.load).mockResolvedValueOnce({
			values: new Map([['root', { value: 5 }]]),
			issues: [],
		});

		await persistence.restore();

		expect(sessionSource.source.create).toHaveBeenCalledWith({
			id: 'root',
			state: { value: 5 },
		});
	});
});
