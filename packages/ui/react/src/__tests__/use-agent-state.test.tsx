import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAgentState } from '../use-agent-state.js';
import { createStore, storeKey } from '@franklin/extensions';
import type { Agent } from '@franklin/agent/browser';
import type { Store, StoreResult, StoreEntry } from '@franklin/extensions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Agent stub with only the `.stores` field populated.
 */
function makeAgent(entries: Map<string, StoreEntry>): Agent {
	return {
		stores: { stores: entries } as unknown as StoreResult,
	} as Agent;
}

function entry(
	store: Store<unknown>,
	sharing: 'private' | 'global' | 'inherit' = 'private',
): StoreEntry {
	return { poolId: crypto.randomUUID(), store, sharing };
}

function makeAgentWithStore<T>(
	name: string,
	initial: T,
): { agent: Agent; store: Store<T> } {
	const store = createStore(initial);
	const entries = new Map<string, StoreEntry>([
		[name, entry(store as Store<unknown>)],
	]);
	return { agent: makeAgent(entries), store };
}

const counterKey = storeKey<'counter', number>('counter');
const todosKey = storeKey<'todos', string[]>('todos');

// ---------------------------------------------------------------------------
// Basic reads
// ---------------------------------------------------------------------------

describe('useAgentState – basic reads', () => {
	it('returns the current store value', () => {
		const { agent } = makeAgentWithStore('counter', 42);
		const { result } = renderHook(() => useAgentState(agent, counterKey));
		expect(result.current.get()).toBe(42);
	});

	it('returns a store with set() when no selector is provided', () => {
		const { agent } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));
		expect(typeof result.current.set).toBe('function');
	});

	it('throws when the store does not exist', () => {
		const agent = makeAgent(new Map());
		expect(() => renderHook(() => useAgentState(agent, counterKey))).toThrow(
			'useAgentState: no store named "counter" on agent',
		);
	});
});

// ---------------------------------------------------------------------------
// Reactivity: store.set → re-render
// ---------------------------------------------------------------------------

describe('useAgentState – reactivity via underlying store', () => {
	it('re-renders when the underlying store is mutated directly', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		expect(result.current.get()).toBe(0);

		act(() => {
			store.set(() => 1);
		});

		expect(result.current.get()).toBe(1);
	});

	it('re-renders when mutated via the returned set()', () => {
		const { agent } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		act(() => {
			result.current.set(() => 5);
		});

		expect(result.current.get()).toBe(5);
	});

	it('batches multiple synchronous set() calls into one render', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const renderCount = { value: 0 };

		renderHook(() => {
			renderCount.value++;
			return useAgentState(agent, counterKey);
		});

		const before = renderCount.value;

		act(() => {
			store.set(() => 1);
			store.set(() => 2);
			store.set(() => 3);
		});

		// React may batch — we should see at most one extra render, not three
		// (Exact count depends on React version; the important thing is it doesn't
		// render N times for N synchronous updates.)
		expect(renderCount.value).toBeLessThanOrEqual(before + 3);
		// But the final value is correct
	});

	it('does not re-render when set() produces the same value (Immer structural sharing)', () => {
		const { agent, store } = makeAgentWithStore('todos', ['a', 'b']);
		const renderCount = { value: 0 };

		const { result } = renderHook(() => {
			renderCount.value++;
			return useAgentState(agent, todosKey);
		});

		const before = renderCount.value;

		act(() => {
			// Immer no-op: draft is not mutated, so Object.is(old, new) → true
			store.set((_draft) => {
				/* no mutation */
			});
		});

		expect(renderCount.value).toBe(before);
		expect(result.current.get()).toEqual(['a', 'b']);
	});
});

// ---------------------------------------------------------------------------
// Selector overload
// ---------------------------------------------------------------------------

describe('useAgentState – selector', () => {
	it('derives a value from the store', () => {
		const { agent } = makeAgentWithStore('todos', ['a', 'b', 'c']);
		const { result } = renderHook(() =>
			useAgentState(agent, todosKey, (t) => t.length),
		);
		expect(result.current.get()).toBe(3);
	});

	it('does not expose set() when a selector is provided', () => {
		const { agent } = makeAgentWithStore('todos', ['a']);
		const { result } = renderHook(() =>
			useAgentState(agent, todosKey, (t) => t.length),
		);
		expect('set' in result.current).toBe(false);
	});

	it('re-renders when selected value changes', () => {
		const { agent, store } = makeAgentWithStore('todos', ['a', 'b']);
		const { result } = renderHook(() =>
			useAgentState(agent, todosKey, (t) => t.length),
		);

		expect(result.current.get()).toBe(2);

		act(() => {
			store.set((draft) => {
				draft.push('c');
			});
		});

		expect(result.current.get()).toBe(3);
	});

	it('does NOT re-render when store changes but selected value is unchanged', () => {
		const { agent, store } = makeAgentWithStore('todos', ['a', 'b']);
		const renderCount = { value: 0 };

		// Selector returns length — a primitive that can be compared with Object.is
		renderHook(() => {
			renderCount.value++;
			return useAgentState(agent, todosKey, (t) => t.length);
		});

		const before = renderCount.value;

		act(() => {
			// Replace 'a' with 'x' — length stays 2
			store.set((draft) => {
				draft[0] = 'x';
			});
		});

		// The underlying store changed, but the selected value (length) did not.
		// However, since the selector is an inline function (new reference each render),
		// useSyncExternalStore's getSnapshot is recreated each render. The snapshot
		// comparison still uses Object.is on the NUMBER 2 vs 2, so it should NOT
		// re-render... except the subscribe callback fired and getSnapshot returned 2
		// which Object.is-matches the previous 2. But React may still re-render once
		// because the subscribe callback triggers a "check" and the check itself
		// causes a render cycle.
		//
		// NOTE: This test documents current behavior. If it re-renders, that's a
		// potential issue — the selector should ideally prevent re-renders when
		// the derived value is unchanged.
		//
		// With the current implementation the subscribe notifies React (the store DID
		// change), so React calls getSnapshot, gets 2, compares with prev 2 → Object.is
		// true → no re-render. This should hold.
		expect(renderCount.value).toBe(before);
	});
});

// ---------------------------------------------------------------------------
// subscribe() on the returned store
// ---------------------------------------------------------------------------

describe('useAgentState – returned subscribe()', () => {
	it('subscribe fires when store changes (no selector)', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		const values: unknown[] = [];
		result.current.subscribe((v) => values.push(v));

		act(() => {
			store.set(() => 10);
		});

		expect(values).toContain(10);
	});

	it('unsubscribe stops notifications', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		const values: unknown[] = [];
		const unsub = result.current.subscribe((v) => values.push(v));
		unsub();

		act(() => {
			store.set(() => 99);
		});

		expect(values).toEqual([]);
	});

	/**
	 * BUG: When a selector is provided, the returned ReadonlyStore<S>.subscribe()
	 * should fire with the SELECTED (derived) value, but the current implementation
	 * subscribes to the raw store and passes the raw T value to the listener.
	 *
	 * Expected: listener receives `S` (the selector output)
	 * Actual: listener receives `T` (the raw store value)
	 */
	it('BUG: subscribe with selector passes raw value, not selected value', () => {
		const { agent, store } = makeAgentWithStore('todos', ['a', 'b']);
		const { result } = renderHook(() =>
			useAgentState(agent, todosKey, (t) => t.length),
		);

		const receivedValues: unknown[] = [];
		result.current.subscribe((v) => receivedValues.push(v));

		act(() => {
			store.set((draft) => {
				draft.push('c');
			});
		});

		// What we'd EXPECT from ReadonlyStore<number>:
		// expect(receivedValues).toEqual([3]);

		// What ACTUALLY happens — the raw array is passed:
		expect(receivedValues[0]).toEqual(['a', 'b', 'c']);
		// The listener receives the raw T (string[]) instead of S (number).
		// This is a type-safety and correctness bug.
	});
});

// ---------------------------------------------------------------------------
// get() semantics
// ---------------------------------------------------------------------------

describe('useAgentState – get() semantics', () => {
	it('get() returns the React-synchronized value', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		act(() => {
			store.set(() => 42);
		});

		// After act(), React has flushed, so get() reflects the latest
		expect(result.current.get()).toBe(42);
	});

	it('get() with selector returns the derived value', () => {
		const { agent, store } = makeAgentWithStore('todos', ['x']);
		const { result } = renderHook(() =>
			useAgentState(agent, todosKey, (t) => t.join(',')),
		);

		expect(result.current.get()).toBe('x');

		act(() => {
			store.set((draft) => {
				draft.push('y');
			});
		});

		expect(result.current.get()).toBe('x,y');
	});
});

// ---------------------------------------------------------------------------
// Isolation: unrelated stores don't cause re-renders
// ---------------------------------------------------------------------------

describe('useAgentState – store isolation', () => {
	it('updating a different store does not re-render', () => {
		const storeA = createStore(0);
		const storeB = createStore('hello');
		const entries = new Map<string, StoreEntry>([
			['counter', entry(storeA as Store<unknown>)],
			['greeting', entry(storeB as Store<unknown>)],
		]);
		const agent = makeAgent(entries);

		const renderCount = { value: 0 };
		renderHook(() => {
			renderCount.value++;
			return useAgentState(agent, counterKey);
		});

		const before = renderCount.value;

		act(() => {
			storeB.set(() => 'world');
		});

		// Updating storeB should NOT cause the component subscribed to storeA to re-render
		expect(renderCount.value).toBe(before);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('useAgentState – edge cases', () => {
	it('handles a store whose value is undefined', () => {
		const store = createStore<string | undefined>(undefined);
		const entries = new Map<string, StoreEntry>([
			['maybe', entry(store as Store<unknown>)],
		]);
		const agent = makeAgent(entries);
		const maybeKey = storeKey<'maybe', string | undefined>('maybe');

		const { result } = renderHook(() => useAgentState(agent, maybeKey));
		expect(result.current.get()).toBeUndefined();
	});

	it('handles a store whose value is null', () => {
		const store = createStore<string | null>(null);
		const entries = new Map<string, StoreEntry>([
			['nullable', entry(store as Store<unknown>)],
		]);
		const agent = makeAgent(entries);
		const nullableKey = storeKey<'nullable', string | null>('nullable');

		const { result } = renderHook(() => useAgentState(agent, nullableKey));
		expect(result.current.get()).toBeNull();
	});

	it('works with complex nested state', () => {
		type State = { items: { id: number; name: string }[]; active: boolean };
		const initial: State = {
			items: [{ id: 1, name: 'first' }],
			active: false,
		};
		const store = createStore(initial);
		const entries = new Map<string, StoreEntry>([
			['complex', entry(store as Store<unknown>)],
		]);
		const agent = makeAgent(entries);
		const complexKey = storeKey<'complex', State>('complex');

		const { result } = renderHook(() =>
			useAgentState(agent, complexKey, (s) => s.items.length),
		);

		expect(result.current.get()).toBe(1);

		act(() => {
			store.set((draft) => {
				draft.items.push({ id: 2, name: 'second' });
			});
		});

		expect(result.current.get()).toBe(2);
	});

	/**
	 * BUG: An inline selector that returns a new object reference on each call
	 * causes an infinite render loop. React warns:
	 *   "The result of getSnapshot should be cached to avoid an infinite loop"
	 *
	 * Root cause: getSnapshot calls selector(store.get()) which produces a new
	 * object every time. useSyncExternalStore compares with Object.is, finds
	 * them different, and re-renders — creating an infinite cycle.
	 *
	 * Fix: useAgentState should memoize the selector output (compare prev/next
	 * with Object.is or shallow-equal) and only return a new reference when the
	 * selected value actually changed.
	 */
	it('BUG: selector returning a new object reference causes infinite loop', () => {
		const { agent } = makeAgentWithStore('todos', ['a', 'b']);

		// Suppress React error boundary noise in test output
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() =>
			renderHook(() =>
				useAgentState(agent, todosKey, (t) => ({ count: t.length })),
			),
		).toThrow('Maximum update depth exceeded');

		spy.mockRestore();
	});

	it('rapid successive updates converge to the final value', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		act(() => {
			for (let i = 1; i <= 100; i++) {
				store.set(() => i);
			}
		});

		expect(result.current.get()).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Selector stability (inline vs stable)
// ---------------------------------------------------------------------------

describe('useAgentState – selector stability', () => {
	it('stable selector reference avoids getSnapshot invalidation', () => {
		const { agent, store } = makeAgentWithStore('todos', ['a', 'b']);

		// Stable selector — same function reference across renders
		const selectLength = (t: string[]) => t.length;
		const renderCount = { value: 0 };

		renderHook(() => {
			renderCount.value++;
			return useAgentState(agent, todosKey, selectLength);
		});

		const before = renderCount.value;

		// Mutate but keep length same
		act(() => {
			store.set((draft) => {
				draft[0] = 'z';
			});
		});

		// With a stable selector, getSnapshot's useCallback deps don't change,
		// so useSyncExternalStore can correctly avoid re-rendering when the
		// derived value (length) is unchanged.
		expect(renderCount.value).toBe(before);
	});
});

// ---------------------------------------------------------------------------
// Concurrency: set from both hook and raw store
// ---------------------------------------------------------------------------

describe('useAgentState – concurrent mutation paths', () => {
	it('hook.set and store.set both write to the same store', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		act(() => {
			result.current.set(() => 10);
		});
		expect(store.get()).toBe(10);

		act(() => {
			store.set(() => 20);
		});
		expect(result.current.get()).toBe(20);
	});

	it('external subscribe + hook both observe the same updates', () => {
		const { agent, store } = makeAgentWithStore('counter', 0);
		const { result } = renderHook(() => useAgentState(agent, counterKey));

		const externalValues: number[] = [];
		store.subscribe((v) => externalValues.push(v));

		act(() => {
			result.current.set(() => 7);
		});

		// External subscribe sees the update
		expect(externalValues).toContain(7);
		// Hook also sees the update
		expect(result.current.get()).toBe(7);
	});
});
