import { useCallback, useSyncExternalStore } from 'react';

import type {
	Agent,
	ReadonlyStore,
	Store,
	StoreKey,
} from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// useAgentState
// ---------------------------------------------------------------------------

/**
 * Subscribe to a specific agent extension store by name.
 *
 * Looks up the store in `agent.stores.stores` (the compiled StoreResult map).
 * Re-renders **only** when that store's value changes — other stores
 * updating will not cause a re-render.
 *
 * @example
 * ```tsx
 * const agent = useAgent();
 * const todos = useAgentState(agent, todoKey);                // Store<Todo[]>
 * const count = useAgentState(agent, todoKey, t => t.length); // ReadonlyStore<number>
 * ```
 */

// StoreKey + selector → ReadonlyStore<S>
export function useAgentState<T, S>(
	agent: Agent,
	key: StoreKey<string, T>,
	selector: (value: T) => S,
): ReadonlyStore<S>;

// StoreKey alone → Store<T>
export function useAgentState<T>(
	agent: Agent,
	key: StoreKey<string, T>,
): Store<T>;

export function useAgentState(
	agent: Agent,
	storeName: string,
	selector?: (value: unknown) => unknown,
): unknown {
	const entry = agent.stores.stores.get(storeName);

	if (!entry) {
		throw new Error(`useAgentState: no store named "${storeName}" on agent`);
	}

	const store = entry.store;

	const subscribe = useCallback(
		(cb: () => void) => store.subscribe(cb),
		[store],
	);

	const getSnapshot = useCallback(() => {
		const value = store.get();
		return selector ? selector(value) : value;
	}, [store, selector]);

	const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const subscribeTyped = useCallback(
		(listener: (value: unknown) => void) => {
			return store.subscribe(listener);
		},
		[store],
	);

	if (selector) {
		return { get: () => value, subscribe: subscribeTyped };
	}

	const set = useCallback(
		(...args: Parameters<typeof store.set>) => {
			store.set(...args);
		},
		[store],
	);

	return { get: () => value, subscribe: subscribeTyped, set };
}
