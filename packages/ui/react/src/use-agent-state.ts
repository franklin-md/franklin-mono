import { useCallback, useSyncExternalStore } from 'react';

import type {
	Agent,
	Extension,
	ExtensionStores,
	Store,
} from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Store value type helper
// ---------------------------------------------------------------------------

/** Extracts T from Store<T>. */
type StoreValue<S> = S extends Store<infer T> ? T : never;

/** The raw value type for a given store name on an agent. */
type AgentStoreValue<
	E extends readonly Extension<any>[],
	K extends string & keyof ExtensionStores<E>,
> = StoreValue<ExtensionStores<E>[K]>;

// ---------------------------------------------------------------------------
// useAgentState
// ---------------------------------------------------------------------------

/**
 * Subscribe to a specific agent extension store by name.
 *
 * Pass the same agent handle from `useAgent()` so **E** and store key **K**
 * are inferred from values — no type arguments needed on this hook.
 *
 * Re-renders **only** when that store's value changes — other stores
 * updating will not cause a re-render.
 *
 * @example
 * ```tsx
 * const agent = useAgent<MyExtensions>();
 * const todos = useAgentState(agent, 'todo');
 * const count = useAgentState(agent, 'todo', (t) => t.length);
 * ```
 */

export function useAgentState<
	E extends readonly Extension<any>[],
	K extends keyof ExtensionStores<E> & string,
>(agent: Agent<E>, storeName: K): AgentStoreValue<E, K>;
export function useAgentState<
	E extends readonly Extension<any>[],
	K extends keyof ExtensionStores<E> & string,
	S,
>(
	agent: Agent<E>,
	storeName: K,
	selector: (value: AgentStoreValue<E, K>) => S,
): S;
export function useAgentState<
	E extends readonly Extension<any>[],
	K extends keyof ExtensionStores<E> & string,
>(
	agent: Agent<E>,
	storeName: K,
	selector?: (value: AgentStoreValue<E, K>) => unknown,
): unknown {
	const store = (agent as Record<string, Store<unknown>>)[storeName];

	if (!store) {
		throw new Error(`useAgentState: no store named "${storeName}" on agent`);
	}

	const subscribe = useCallback(
		(cb: () => void) => store.subscribe(cb),
		[store],
	);

	const getSnapshot = useCallback(() => {
		const value = store.get();
		return selector ? selector(value as AgentStoreValue<E, K>) : value;
	}, [store, selector]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
