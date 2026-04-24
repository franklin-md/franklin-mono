import { act, renderHook } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useCollectionNavigator } from '../utils/use-collection-navigator.js';

type TestItem = {
	id: string;
};

function createTestItems(count: number): TestItem[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `item-${index}`,
	}));
}

const getKey = (item: TestItem) => item.id;

describe('useCollectionNavigator', () => {
	it('navigates to newly added items using the latest collection ref', () => {
		const { result } = renderHook(() => {
			const [items, setItems] = useState(createTestItems(3));
			const navigator = useCollectionNavigator(items, getKey);

			return { items, navigator, setItems };
		});

		expect(result.current.navigator.currentIndex).toBe(0);
		expect(result.current.navigator.currentItem?.id).toBe('item-0');

		const navigateToItem = result.current.navigator.navigateToItem;

		act(() => {
			result.current.setItems((items) => [...items, { id: 'item-new' }]);
		});

		act(() => {
			navigateToItem('item-new');
		});

		expect(result.current.navigator.currentIndex).toBe(3);
		expect(result.current.navigator.currentItem?.id).toBe('item-new');
	});

	it('repairs selection after deleting the active item without an intermediate empty state', () => {
		const stateTrace: Array<{
			currentIndex: number | undefined;
			currentItemId: string | undefined;
			itemsLength: number;
		}> = [];

		const { result } = renderHook(() => {
			const [items, setItems] = useState(createTestItems(5));
			const navigator = useCollectionNavigator(items, getKey);

			useEffect(() => {
				stateTrace.push({
					currentIndex: navigator.currentIndex,
					currentItemId: navigator.currentItem?.id,
					itemsLength: items.length,
				});
			});

			return { items, navigator, setItems };
		});

		act(() => {
			result.current.navigator.navigateByPosition(2);
		});

		stateTrace.length = 0;

		act(() => {
			result.current.setItems((items) =>
				items.filter((item) => item.id !== 'item-2'),
			);
		});

		expect(stateTrace).not.toHaveLength(0);
		for (const state of stateTrace) {
			expect(state.currentIndex).toBe(2);
			expect(state.currentItemId).toBe('item-3');
			expect(state.itemsLength).toBe(4);
		}
	});

	it('can start from the last item when configured to do so', () => {
		const { result } = renderHook(() =>
			useCollectionNavigator(createTestItems(3), getKey, {
				initialPosition: 'last',
			}),
		);

		expect(result.current.currentIndex).toBe(2);
		expect(result.current.currentItem?.id).toBe('item-2');
	});

	it('removeEntry selects the previous remaining entry and calls the callback', () => {
		const removed: string[] = [];

		const { result } = renderHook(() => {
			const [items] = useState(createTestItems(3));
			const navigator = useCollectionNavigator(items, getKey, {
				removeEntry: (key) => {
					removed.push(key);
				},
			});

			return navigator;
		});

		act(() => {
			result.current.navigateByPosition(2);
		});

		act(() => {
			result.current.removeEntry('item-2');
		});

		expect(removed).toEqual(['item-2']);
		expect(result.current.currentIndex).toBe(1);
		expect(result.current.currentKey).toBe('item-1');
		expect(result.current.currentItem?.id).toBe('item-1');
	});
});
