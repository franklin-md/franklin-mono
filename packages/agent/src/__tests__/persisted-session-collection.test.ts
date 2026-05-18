import { describe, expect, it, vi } from 'vitest';

import type {
	BaseRuntime,
	StateHandle,
	RuntimeEntry,
} from '@franklin/extensions';

import { PersistedSessionCollection } from '../agent/session/persisted-session-collection.js';
import type { SessionPersistence } from '../storage/types.js';

type TestState = {
	value: number;
};

type TestRuntime = BaseRuntime;

function createRuntime(state: TestState): {
	runtime: TestRuntime;
	stateHandle: StateHandle<TestState>;
} {
	const runtime: TestRuntime = {
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
	};
	const stateHandle: StateHandle<TestState> = {
		get: vi.fn(async () => ({ ...state })),
		fork: vi.fn(async () => ({ ...state })),
		child: vi.fn(async () => ({ ...state })),
	};

	return { runtime, stateHandle };
}

function createPersister(): SessionPersistence<TestState> {
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

describe('PersistedSessionCollection', () => {
	it('persists initial state and injected runtime observer changes', async () => {
		const state = { value: 1 };
		const { runtime, stateHandle } = createRuntime(state);
		const persister = createPersister();
		const { observe, notify } = createObserver();
		const collection = new PersistedSessionCollection<TestState, TestRuntime>(
			persister,
			() => stateHandle,
			observe,
		);

		collection.set('root', runtime);

		await vi.waitFor(() => {
			expect(persister.save).toHaveBeenCalledWith('root', { value: 1 });
		});
		expect(observe).toHaveBeenCalledWith(runtime, expect.any(Function));
		expect(runtime.subscribe).not.toHaveBeenCalled();

		vi.mocked(persister.save).mockClear();
		state.value = 2;
		notify(runtime);

		await vi.waitFor(() => {
			expect(persister.save).toHaveBeenCalledWith('root', { value: 2 });
		});
	});

	it('unsubscribes runtime observers when a runtime is removed', async () => {
		const { runtime, stateHandle } = createRuntime({ value: 1 });
		const persister = createPersister();
		const { observe, notify } = createObserver();
		const collection = new PersistedSessionCollection<TestState, TestRuntime>(
			persister,
			() => stateHandle,
			observe,
		);

		collection.set('root', runtime);
		await vi.waitFor(() => {
			expect(persister.save).toHaveBeenCalledOnce();
		});

		vi.mocked(persister.save).mockClear();
		await collection.remove('root');
		notify(runtime);

		expect(persister.save).not.toHaveBeenCalled();
		expect(persister.delete).toHaveBeenCalledWith('root');
	});

	it('restores persisted entries through the supplied hydrate callback', async () => {
		const persister = createPersister();
		const { observe } = createObserver();
		const collection = new PersistedSessionCollection<TestState, TestRuntime>(
			persister,
			() => ({
				get: vi.fn(async () => ({ value: 0 })),
				fork: vi.fn(async () => ({ value: 0 })),
				child: vi.fn(async () => ({ value: 0 })),
			}),
			observe,
		);
		vi.mocked(persister.load).mockResolvedValueOnce({
			values: new Map([['root', { value: 5 }]]),
			issues: [],
		});
		const hydrate = vi.fn(
			async (
				id: string,
				state: TestState,
			): Promise<RuntimeEntry<TestRuntime>> => {
				const { runtime } = createRuntime(state);
				return { id, runtime };
			},
		);

		await collection.restore(hydrate);

		expect(hydrate).toHaveBeenCalledWith('root', { value: 5 });
	});
});
