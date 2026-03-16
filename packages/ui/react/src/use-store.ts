import { useSyncExternalStore } from 'react';

import type { ReadonlyStore } from '@franklin/agent/browser';

/**
 * React hook that subscribes to a Franklin `ReadonlyStore` and
 * returns the current value. Re-renders automatically when the
 * store updates. Compatible with React 18+ concurrent features.
 */
export function useStore<T>(store: ReadonlyStore<T>): T {
	return useSyncExternalStore(
		(cb) => store.subscribe(cb),
		() => store.get(),
	);
}
