import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createStore } from '@franklin/extensions';

import { useStore } from '../utils/use-store.js';

describe('useStore – no selector', () => {
	it('returns the current store value', () => {
		const store = createStore(42);
		const { result } = renderHook(() => useStore(store));
		expect(result.current.get()).toBe(42);
	});

	it('returns set()', () => {
		const store = createStore(0);
		const { result } = renderHook(() => useStore(store));
		expect(typeof result.current.set).toBe('function');
	});

	it('re-renders when the store is mutated directly', () => {
		const store = createStore(0);
		const { result } = renderHook(() => useStore(store));

		expect(result.current.get()).toBe(0);

		act(() => {
			store.set(() => 1);
		});

		expect(result.current.get()).toBe(1);
	});

	it('re-renders when mutated via the returned set()', () => {
		const store = createStore(0);
		const { result } = renderHook(() => useStore(store));

		act(() => {
			result.current.set(() => 5);
		});

		expect(result.current.get()).toBe(5);
	});

	it('does not re-render when set() produces the same value (Immer structural sharing)', () => {
		const store = createStore(['a', 'b']);
		const renderCount = { value: 0 };

		const { result } = renderHook(() => {
			renderCount.value++;
			return useStore(store);
		});

		const before = renderCount.value;

		act(() => {
			store.set((_draft) => {
				/* no mutation */
			});
		});

		expect(renderCount.value).toBe(before);
		expect(result.current.get()).toEqual(['a', 'b']);
	});
});

describe('useStore – selector', () => {
	it('derives a value from the store', () => {
		const store = createStore(['a', 'b', 'c']);
		const { result } = renderHook(() => useStore(store, (t) => t.length));
		expect(result.current.get()).toBe(3);
	});

	it('does not expose set() when a selector is provided', () => {
		const store = createStore(['a']);
		const { result } = renderHook(() => useStore(store, (t) => t.length));
		expect('set' in result.current).toBe(false);
	});

	it('re-renders when selected value changes', () => {
		const store = createStore(['a', 'b']);
		const { result } = renderHook(() => useStore(store, (t) => t.length));

		expect(result.current.get()).toBe(2);

		act(() => {
			store.set((draft) => {
				draft.push('c');
			});
		});

		expect(result.current.get()).toBe(3);
	});

	it('does not re-render when store changes but selected value is unchanged', () => {
		const store = createStore(['a', 'b']);
		const renderCount = { value: 0 };

		renderHook(() => {
			renderCount.value++;
			return useStore(store, (t) => t.length);
		});

		const before = renderCount.value;

		act(() => {
			store.set((draft) => {
				draft[0] = 'x';
			});
		});

		expect(renderCount.value).toBe(before);
	});

	it('handles null store value with a selector', () => {
		const store = createStore<string | null>(null);
		const { result } = renderHook(() =>
			useStore(store, (v) => (v === null ? 'nil' : v)),
		);
		expect(result.current.get()).toBe('nil');
	});
});

describe('useStore – subscribe', () => {
	it('subscribe fires with raw value when no selector', () => {
		const store = createStore(0);
		const { result } = renderHook(() => useStore(store));

		const values: unknown[] = [];
		result.current.subscribe((v) => values.push(v));

		act(() => {
			store.set(() => 10);
		});

		expect(values).toContain(10);
	});

	it('unsubscribe stops notifications', () => {
		const store = createStore(0);
		const { result } = renderHook(() => useStore(store));

		const values: unknown[] = [];
		const unsub = result.current.subscribe((v) => values.push(v));
		unsub();

		act(() => {
			store.set(() => 99);
		});

		expect(values).toEqual([]);
	});

	it('subscribe passes the selected value when a selector is used', () => {
		const store = createStore(['a', 'b']);
		const { result } = renderHook(() => useStore(store, (t) => t.length));

		const receivedValues: unknown[] = [];
		result.current.subscribe((v) => receivedValues.push(v));

		act(() => {
			store.set((draft) => {
				draft.push('c');
			});
		});

		expect(receivedValues).toEqual([3]);
	});
});

describe('useStore – get() with selector', () => {
	it('get() returns the derived value after updates', () => {
		const store = createStore(['x']);
		const { result } = renderHook(() => useStore(store, (t) => t.join(',')));

		expect(result.current.get()).toBe('x');

		act(() => {
			store.set((draft) => {
				draft.push('y');
			});
		});

		expect(result.current.get()).toBe('x,y');
	});
});
