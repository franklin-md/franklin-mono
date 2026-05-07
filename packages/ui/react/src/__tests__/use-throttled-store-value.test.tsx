import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '@franklin/extensions';

import { getSharedThrottledStore } from '../utils/get-shared-throttled-store.js';
import { useThrottledStoreValue } from '../utils/use-throttled-store-value.js';

const BLOCKER = new Int32Array(new SharedArrayBuffer(4));

function blockFor(ms: number): void {
	if (ms <= 0) return;
	Atomics.wait(BLOCKER, 0, 0, Math.ceil(ms));
}

afterEach(() => {
	vi.useRealTimers();
});

describe('useThrottledStoreValue', () => {
	it('shares one throttled store per source store and throttle interval', () => {
		const store = createStore(0);
		const first = getSharedThrottledStore(store, { throttleMs: 20 });
		const second = getSharedThrottledStore(store, { throttleMs: 20 });
		const otherInterval = getSharedThrottledStore(store, { throttleMs: 30 });

		expect(second).toBe(first);
		expect(otherInterval).not.toBe(first);
	});

	it('publishes one shared throttled value to all subscribers', () => {
		vi.useFakeTimers();
		const store = createStore(0);
		const throttled = getSharedThrottledStore(store, { throttleMs: 20 });
		const firstValues: number[] = [];
		const secondValues: number[] = [];

		const unsubscribeFirst = throttled.subscribe((value) => {
			firstValues.push(value);
		});
		const unsubscribeSecond = throttled.subscribe((value) => {
			secondValues.push(value);
		});

		act(() => {
			store.set(() => 1);
			store.set(() => 2);
		});

		expect(throttled.get()).toBe(0);
		expect(firstValues).toEqual([]);
		expect(secondValues).toEqual([]);

		act(() => {
			vi.advanceTimersByTime(20);
		});

		expect(throttled.get()).toBe(2);
		expect(firstValues).toEqual([2]);
		expect(secondValues).toEqual([2]);

		unsubscribeFirst();
		unsubscribeSecond();
	});

	it('drops intermediate updates and publishes the latest value', () => {
		vi.useFakeTimers();
		const store = createStore(0);
		const renderCount = { value: 0 };

		const { result } = renderHook(() => {
			renderCount.value++;
			return useThrottledStoreValue(store, { throttleMs: 20 });
		});

		const before = renderCount.value;

		act(() => {
			store.set(() => 1);
			store.set(() => 2);
			store.set(() => 3);
		});

		expect(result.current).toBe(0);
		expect(renderCount.value).toBe(before);

		act(() => {
			vi.advanceTimersByTime(20);
		});

		expect(result.current).toBe(3);
		expect(renderCount.value).toBeGreaterThan(before);
	});

	it('does not run expensive React work inline with source updates', () => {
		vi.useFakeTimers();
		const store = createStore(0);
		let renderCount = 0;

		const { result } = renderHook(() => {
			renderCount++;
			blockFor(8);
			return useThrottledStoreValue(store, { throttleMs: 20 });
		});
		const before = renderCount;

		act(() => {
			for (let i = 1; i <= 100; i++) {
				store.set(() => i);
			}
		});

		expect(renderCount).toBe(before);
		expect(result.current).toBe(0);

		act(() => {
			vi.advanceTimersByTime(20);
		});

		expect(renderCount).toBeGreaterThan(before);
		expect(result.current).toBe(100);
	});

	it('keeps returning the published value across unrelated rerenders', () => {
		vi.useFakeTimers();
		const store = createStore(0);
		let unrelated = 0;
		const { result, rerender } = renderHook(() => {
			void unrelated;
			return useThrottledStoreValue(store, { throttleMs: 20 });
		});

		act(() => {
			store.set(() => 1);
		});

		unrelated++;
		rerender();

		expect(result.current).toBe(0);

		act(() => {
			vi.advanceTimersByTime(20);
		});

		expect(result.current).toBe(1);
	});
});
