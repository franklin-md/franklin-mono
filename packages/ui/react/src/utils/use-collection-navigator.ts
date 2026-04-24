import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CollectionNavigatorState = {
	lastIndex: number | undefined;
	currentKey: string | undefined;
	preserveMissingKey: boolean;
};

type CollectionNavigatorOptions = {
	initialPosition?: 'first' | 'last';
	removeEntry?: (key: string) => unknown;
};

function sameNavigatorState(
	left: CollectionNavigatorState,
	right: CollectionNavigatorState,
): boolean {
	return (
		left.lastIndex === right.lastIndex &&
		left.currentKey === right.currentKey &&
		left.preserveMissingKey === right.preserveMissingKey
	);
}

/**
 * Generic hook to navigate through a collection of items while maintaining
 * stable selection even when the collection mutates (items added / removed).
 *
 * @param items     Collection of items to navigate.
 * @param getKey    Function that returns a unique, stable key for each item.
 */
export function useCollectionNavigator<T>(
	items: readonly T[],
	getKey: (item: T) => string,
	options?: CollectionNavigatorOptions,
) {
	// The key of the currently selected item. This is the "source of truth" for
	// the selection. When this changes, the useEffect below will sync the index.
	const [state, setState] = useState<CollectionNavigatorState>({
		lastIndex: undefined,
		currentKey: undefined,
		preserveMissingKey: false,
	});

	// Latest ref pattern: Keep a ref to the latest items and getKey
	// so that navigation functions always access the current collection
	// even if they were captured in a stale closure.
	// IMPORTANT: Update refs during render (not in useEffect) so they're
	// immediately available when navigation is called in the same callback
	// as a state update (e.g., optimistic mutation + immediate navigation)
	const itemsRef = useRef(items);
	const getKeyRef = useRef(getKey);
	itemsRef.current = items;
	getKeyRef.current = getKey;

	// This effect is the core of the hook. It's responsible for keeping the
	// currentKey and currentIndex in sync with the items array.
	useEffect(() => {
		setState((currentState) => {
			// The items array has changed, so we might need to adjust currentKey
			const nextState = (() => {
				const determineNextState = (): CollectionNavigatorState => {
					/*

			      1) We are not selecting anything:
			      1.1) The collection is empty:
			      1.2) The collection is not empty:

			      2) We are selecting something:
			      2.1) The collection is empty:
			      2.2) The collection is not empty:
			      2.2.1) The collection does not contain the key:
			      2.2.2) The collection contains the key:

			      */
					if (currentState.currentKey === undefined) {
						// Case 1: Not selecting anything
						if (items.length === 0) {
							// 1.1
							return {
								lastIndex: undefined,
								currentKey: undefined,
								preserveMissingKey: false,
							};
						}

						// 1.2
						const initialIndex =
							options?.initialPosition === 'last' ? items.length - 1 : 0;
						const initialItem = items[initialIndex];
						if (initialItem === undefined) {
							return {
								lastIndex: undefined,
								currentKey: undefined,
								preserveMissingKey: false,
							};
						}

						return {
							lastIndex: initialIndex,
							currentKey: getKeyRef.current(initialItem),
							preserveMissingKey: false,
						};
					}

					// Case 2: Selecting something
					if (items.length === 0) {
						// 2.1
						return currentState.preserveMissingKey
							? currentState
							: {
									lastIndex: undefined,
									currentKey: undefined,
									preserveMissingKey: false,
								};
					}

					// 2.2
					const currentIndex = items.findIndex(
						(item) => getKeyRef.current(item) === currentState.currentKey,
					);
					if (currentIndex !== -1) {
						// 2.2.2
						const currentItem = items[currentIndex];
						if (currentItem === undefined) {
							return {
								lastIndex: undefined,
								currentKey: undefined,
								preserveMissingKey: false,
							};
						}

						return {
							lastIndex: currentIndex,
							currentKey: getKeyRef.current(currentItem),
							preserveMissingKey: false,
						};
					}

					if (currentState.preserveMissingKey) {
						// A caller explicitly asked to select a key that is not yet present.
						// Keep holding that target until the collection catches up.
						return currentState;
					}

					// 2.2.1
					// Whatever the last key was, we need to find the next valid key.
					const fallbackIndex = Math.min(
						currentState.lastIndex ?? 0,
						items.length - 1,
					);
					const fallbackItem = items[fallbackIndex];
					if (fallbackItem === undefined) {
						return {
							lastIndex: undefined,
							currentKey: undefined,
							preserveMissingKey: false,
						};
					}

					return {
						lastIndex: fallbackIndex,
						currentKey: getKeyRef.current(fallbackItem),
						preserveMissingKey: false,
					};
				};

				return determineNextState();
			})();

			return sameNavigatorState(currentState, nextState)
				? currentState
				: nextState;
		});
	}, [items, options?.initialPosition]);

	const currentItem = useMemo(() => {
		if (state.lastIndex === undefined) {
			return undefined;
		}

		return items[state.lastIndex];
	}, [items, state.lastIndex]);

	const navigateToItem = useCallback((key: string) => {
		// Use ref to always access the latest items, avoiding stale closures.
		// This is crucial when navigating immediately after mutations/optimistic updates.
		const index = itemsRef.current.findIndex(
			(item) => getKeyRef.current(item) === key,
		);
		if (index === -1) {
			return;
		}

		setState({
			lastIndex: index,
			currentKey: key,
			preserveMissingKey: false,
		});
	}, []);

	const navigateToKey = useCallback((key: string) => {
		const index = itemsRef.current.findIndex(
			(item) => getKeyRef.current(item) === key,
		);
		if (index === -1) {
			setState({
				lastIndex: itemsRef.current.length,
				currentKey: key,
				preserveMissingKey: true,
			});
			return;
		}

		setState({
			lastIndex: index,
			currentKey: key,
			preserveMissingKey: false,
		});
	}, []);

	const navigateByPosition = useCallback((position: number | undefined) => {
		if (position === undefined) {
			setState({
				lastIndex: undefined,
				currentKey: undefined,
				preserveMissingKey: false,
			});
			return;
		}

		if (position < 0 || position >= itemsRef.current.length) {
			return;
		}

		const item = itemsRef.current[position];
		if (item === undefined) {
			return;
		}

		setState({
			lastIndex: position,
			currentKey: getKeyRef.current(item),
			preserveMissingKey: false,
		});
	}, []);

	const removeEntry = useCallback(
		(key: string) => {
			const index = itemsRef.current.findIndex(
				(item) => getKeyRef.current(item) === key,
			);
			if (index === -1) {
				return;
			}

			setState((currentState) => {
				if (currentState.currentKey !== key) {
					return currentState;
				}

				const remaining = itemsRef.current.filter((_, idx) => idx !== index);
				if (remaining.length === 0) {
					return {
						lastIndex: undefined,
						currentKey: undefined,
						preserveMissingKey: false,
					};
				}

				const fallbackIndex = Math.max(0, index - 1);
				const fallbackItem = remaining[fallbackIndex];
				if (fallbackItem === undefined) {
					return {
						lastIndex: undefined,
						currentKey: undefined,
						preserveMissingKey: false,
					};
				}

				return {
					lastIndex: fallbackIndex,
					currentKey: getKeyRef.current(fallbackItem),
					preserveMissingKey: false,
				};
			});

			void options?.removeEntry?.(key);
		},
		[options?.removeEntry],
	);

	return {
		currentItem,
		currentIndex: state.lastIndex,
		currentKey: state.currentKey,
		navigateByPosition,
		navigateToKey,
		navigateToItem,
		removeEntry,
	} as const;
}
