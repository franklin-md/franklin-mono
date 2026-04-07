import { useCallback, useSyncExternalStore } from 'react';

import type { ReadonlyStore, Store } from '@franklin/extensions';

export function useStore<T>(store: Store<T>): Store<T>;
export function useStore<T, S>(
	store: Store<T>,
	selector: (value: T) => S,
): ReadonlyStore<S>;
export function useStore<T, S>(
	store: Store<T>,
	selector?: (value: T) => S,
): Store<T> | ReadonlyStore<S> {
	const subscribe = useCallback(
		(cb: () => void) => store.subscribe(cb),
		[store],
	);

	const getSnapshot = useCallback(() => {
		const value = store.get();
		return selector != null ? selector(value) : value;
	}, [store, selector]);

	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const subscribeOut = useCallback(
		(listener: (value: T | S) => void) => {
			if (selector == null) {
				return store.subscribe(listener as (value: T) => void);
			}
			return store.subscribe((raw) => {
				listener(selector(raw));
			});
		},
		[store, selector],
	);

	if (selector != null) {
		return {
			get: () => snapshot as S,
			subscribe: subscribeOut as ReadonlyStore<S>['subscribe'],
		};
	}

	const set = useCallback(
		(...args: Parameters<Store<T>['set']>) => {
			store.set(...args);
		},
		[store],
	);

	return {
		get: () => snapshot as T,
		subscribe: subscribeOut as Store<T>['subscribe'],
		set,
	};
}
