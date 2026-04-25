import { useCallback, useRef, useSyncExternalStore } from 'react';

import { dequal } from 'dequal';

type Subscribe = (onStoreChange: () => void) => () => void;
type GetSnapshot<T> = () => T;
type IsEqual<T> = (left: T, right: T) => boolean;

type SnapshotRef<T> = {
	value: T;
};

export function useStableExternalStore<T>(
	subscribe: Subscribe,
	getSnapshot: GetSnapshot<T>,
	isEqual: IsEqual<T> = dequal,
): T {
	const snapshotRef = useRef<SnapshotRef<T>>();

	const getStableSnapshot = useCallback(() => {
		const next = getSnapshot();
		const snapshot = snapshotRef.current;
		if (snapshot && isEqual(snapshot.value, next)) {
			return snapshot.value;
		}

		snapshotRef.current = { value: next };
		return next;
	}, [getSnapshot, isEqual]);

	return useSyncExternalStore(subscribe, getStableSnapshot, getStableSnapshot);
}
