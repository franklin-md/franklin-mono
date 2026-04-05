import { describe, it, expect, vi } from 'vitest';
import type { Persister } from '@franklin/lib';
import type { RuntimeBase } from '@franklin/extensions';
import { SessionRegistry } from '../agent/session/registry.js';
import type { SessionSnapshot } from '../agent/session/types.js';

// ---------------------------------------------------------------------------
// Test types — minimal state + runtime for exercising the generic registry
// ---------------------------------------------------------------------------

type TestState = { value: string };
type TestRuntime = RuntimeBase<TestState>;
type TestSnapshot = SessionSnapshot<TestState>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRuntime(): TestRuntime {
	return {
		state: vi.fn(async () => ({ value: '' })),
		fork: vi.fn(async () => ({ value: '' })),
		child: vi.fn(async () => ({ value: '' })),
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
	};
}

function mockSnapshot(sessionId: string): {
	snapshot: TestSnapshot;
	runtime: TestRuntime;
} {
	const runtime = mockRuntime();
	const snapshot: TestSnapshot = {
		sessionId,
		state: { value: 'test' },
	};
	return { snapshot, runtime };
}

function mockPersister(): Persister<TestSnapshot> {
	const store = new Map<string, TestSnapshot>();
	return {
		save: vi.fn(async (key: string, value: TestSnapshot) => {
			store.set(key, value);
		}),
		load: vi.fn(async () => new Map(store)),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionRegistry', () => {
	describe('in-memory operations (no persister)', () => {
		it('register and get', () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const runtime = mockRuntime();
			const { snapshot } = mockSnapshot('s1');

			registry.register({ sessionId: 's1', runtime }, snapshot);

			expect(registry.get('s1').runtime).toBe(runtime);
		});

		it('has returns true for registered, false otherwise', () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const { snapshot } = mockSnapshot('s1');

			expect(registry.has('s1')).toBe(false);
			registry.register({ sessionId: 's1', runtime: mockRuntime() }, snapshot);
			expect(registry.has('s1')).toBe(true);
		});

		it('get throws for unknown session', () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			expect(() => registry.get('nope')).toThrow('Session nope not found');
		});

		it('list returns all sessions', () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const { snapshot: s1 } = mockSnapshot('a');
			const { snapshot: s2 } = mockSnapshot('b');

			registry.register({ sessionId: 'a', runtime: mockRuntime() }, s1);
			registry.register({ sessionId: 'b', runtime: mockRuntime() }, s2);

			expect(registry.list()).toHaveLength(2);
		});

		it('remove disposes runtime and deletes session', async () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const runtime = mockRuntime();
			const { snapshot } = mockSnapshot('s1');

			registry.register({ sessionId: 's1', runtime }, snapshot);
			await registry.remove('s1');

			expect(runtime.dispose).toHaveBeenCalled();
			expect(registry.has('s1')).toBe(false);
		});

		it('remove is a no-op for unknown ids', async () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			await expect(registry.remove('nope')).resolves.toBeUndefined();
		});
	});

	describe('change notifications', () => {
		it('register notifies listeners', () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const listener = vi.fn();
			registry.subscribe(listener);

			const { snapshot } = mockSnapshot('s1');
			registry.register({ sessionId: 's1', runtime: mockRuntime() }, snapshot);

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('remove notifies listeners', async () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const { snapshot } = mockSnapshot('s1');
			registry.register({ sessionId: 's1', runtime: mockRuntime() }, snapshot);

			const listener = vi.fn();
			registry.subscribe(listener);
			await registry.remove('s1');

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('unsubscribe stops notifications', () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			const listener = vi.fn();
			const unsub = registry.subscribe(listener);
			unsub();

			const { snapshot } = mockSnapshot('s1');
			registry.register({ sessionId: 's1', runtime: mockRuntime() }, snapshot);

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('persistence', () => {
		it('register calls persister.save', () => {
			const persister = mockPersister();
			const registry = new SessionRegistry(persister);
			const { snapshot } = mockSnapshot('s1');

			registry.register({ sessionId: 's1', runtime: mockRuntime() }, snapshot);

			expect(persister.save).toHaveBeenCalledWith('s1', snapshot);
		});

		it('remove calls persister.delete', async () => {
			const persister = mockPersister();
			const registry = new SessionRegistry(persister);
			const { snapshot } = mockSnapshot('s1');

			registry.register({ sessionId: 's1', runtime: mockRuntime() }, snapshot);
			await registry.remove('s1');

			expect(persister.delete).toHaveBeenCalledWith('s1');
		});

		it('restore hydrates sessions from persister', async () => {
			const persister = mockPersister();
			const snapshot: TestSnapshot = {
				sessionId: 'restored-1',
				state: { value: 'restored' },
			};
			await persister.save('restored-1', snapshot);

			const registry = new SessionRegistry(persister);
			const hydratedRuntime = mockRuntime();

			await registry.restore(async (_snap) => hydratedRuntime);

			expect(registry.has('restored-1')).toBe(true);
			expect(registry.get('restored-1').runtime).toBe(hydratedRuntime);
		});

		it('restore passes snapshot to hydrate callback', async () => {
			const persister = mockPersister();
			const snapshot: TestSnapshot = {
				sessionId: 'x',
				state: { value: 'check' },
			};
			await persister.save('x', snapshot);

			const registry = new SessionRegistry(persister);
			const hydrate = vi.fn(async () => mockRuntime());

			await registry.restore(hydrate);

			expect(hydrate).toHaveBeenCalledWith(snapshot);
		});

		it('restore notifies listeners when sessions are loaded', async () => {
			const persister = mockPersister();
			await persister.save('a', {
				sessionId: 'a',
				state: { value: '' },
			});

			const registry = new SessionRegistry(persister);
			const listener = vi.fn();
			registry.subscribe(listener);

			await registry.restore(async () => mockRuntime());

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('restore is a no-op without persister', async () => {
			const registry = new SessionRegistry<TestState, TestRuntime>();
			await expect(
				registry.restore(async () => mockRuntime()),
			).resolves.toBeUndefined();
			expect(registry.list()).toHaveLength(0);
		});

		it('restore does not notify when no sessions are loaded', async () => {
			const persister = mockPersister();
			const registry = new SessionRegistry(persister);
			const listener = vi.fn();
			registry.subscribe(listener);

			await registry.restore(async () => mockRuntime());

			expect(listener).not.toHaveBeenCalled();
		});
	});
});
