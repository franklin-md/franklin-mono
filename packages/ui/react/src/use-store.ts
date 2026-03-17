import { useCallback, useSyncExternalStore } from 'react';

import type { Store } from '@franklin/agent/browser';

// Same interface but works instantly within React.
export function useStore<T>(store: Store<T>): Store<T> {
	const value = useSyncExternalStore(
		(cb) => store.subscribe(cb),
		() => store.get(),
	);

	const set = useCallback(
		(...args: Parameters<Store<T>['set']>) => {
			store.set(...args);
		},
		[store],
	);

	const unsubscribe = useCallback(
		(listener: (value: T) => void) => {
			return store.subscribe(listener);
		},
		[store],
	);

	return {
		get: () => value,
		subscribe: unsubscribe,
		set,
	};
}
