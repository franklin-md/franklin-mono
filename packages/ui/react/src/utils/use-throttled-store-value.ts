import { useCallback, useSyncExternalStore } from 'react';

import type { ReadonlyStore } from '@franklin/agent';

import { getSharedThrottledStore } from './get-shared-throttled-store.js';

export type UseThrottledStoreValueOptions = {
	readonly throttleMs: number;
};

export function useThrottledStoreValue<T>(
	store: ReadonlyStore<T>,
	options: UseThrottledStoreValueOptions,
): T {
	const throttledStore = getSharedThrottledStore(store, options);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			return throttledStore.subscribe(onStoreChange);
		},
		[throttledStore],
	);
	const getSnapshot = useCallback(() => throttledStore.get(), [throttledStore]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
