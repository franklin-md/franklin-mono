import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from '../utils/use-debounced-value.js';

afterEach(() => {
	vi.useRealTimers();
});

describe('useDebouncedValue', () => {
	it('returns the initial value immediately', () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => useDebouncedValue('initial', 50));

		expect(result.current).toBe('initial');
	});

	it('publishes the latest value after the delay', () => {
		vi.useFakeTimers();
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 50),
			{ initialProps: { value: 'initial' } },
		);

		rerender({ value: 'next' });
		expect(result.current).toBe('initial');

		act(() => {
			vi.advanceTimersByTime(49);
		});
		expect(result.current).toBe('initial');

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe('next');
	});

	it('cancels the previous timer when the value changes before the delay elapses', () => {
		vi.useFakeTimers();
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 50),
			{ initialProps: { value: 'initial' } },
		);

		rerender({ value: 'first' });
		act(() => {
			vi.advanceTimersByTime(25);
		});
		rerender({ value: 'second' });
		act(() => {
			vi.advanceTimersByTime(24);
		});

		expect(result.current).toBe('initial');

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe('initial');

		act(() => {
			vi.advanceTimersByTime(25);
		});

		expect(result.current).toBe('second');
	});

	it('updates immediately when the delay is zero', () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 0),
			{ initialProps: { value: 'initial' } },
		);

		rerender({ value: 'next' });

		expect(result.current).toBe('next');
	});
});
