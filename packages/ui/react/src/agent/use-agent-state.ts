import type { ReadonlyStore, Store, StoreKey } from '@franklin/extensions';

import { useStore } from '../utils/use-store.js';
import { useAgent } from './agent-context.js';

// ---------------------------------------------------------------------------
// useAgentState
// ---------------------------------------------------------------------------

/**
 * Subscribe to a specific agent extension store by name.
 *
 * Pulls the agent from the nearest `<AgentProvider>` via `useAgent()`.
 * Re-renders **only** when that store's value changes — other stores
 * updating will not cause a re-render.
 *
 * @example
 * ```tsx
 * const todos = useAgentState(todoKey);                // Store<Todo[]>
 * const count = useAgentState(todoKey, t => t.length); // ReadonlyStore<number>
 * ```
 */

// StoreKey + selector → ReadonlyStore<S>
export function useAgentState<T, S>(
	key: StoreKey<string, T>,
	selector: (value: T) => S,
): ReadonlyStore<S>;

// StoreKey alone → Store<T>
export function useAgentState<T>(key: StoreKey<string, T>): Store<T>;

export function useAgentState(
	storeName: string,
	selector?: (value: unknown) => unknown,
): unknown {
	const agent = useAgent();
	const store = agent.getStore(storeName);

	// Is this allowed? This is conditionally calling the hook? (although in both branches it is called.)
	if (selector !== undefined) {
		return useStore(store, selector);
	}
	return useStore(store);
}
