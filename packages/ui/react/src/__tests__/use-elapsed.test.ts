import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useElapsed } from '../utils/use-elapsed.js';

describe('useElapsed', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns 0 on first render when startedAt is now', () => {
		vi.useFakeTimers();
		const t0 = Date.now();
		const { result } = renderHook(() => useElapsed(t0));
		expect(result.current).toBe(0);
	});

	it('increments by intervalMs on each tick', async () => {
		vi.useFakeTimers();
		const t0 = Date.now();
		const { result } = renderHook(() => useElapsed(t0));

		await act(() => vi.advanceTimersByTime(1000));
		expect(result.current).toBe(1000);

		await act(() => vi.advanceTimersByTime(1000));
		expect(result.current).toBe(2000);

		await act(() => vi.advanceTimersByTime(1000));
		expect(result.current).toBe(3000);
	});

	it('respects a custom intervalMs', async () => {
		vi.useFakeTimers();
		const t0 = Date.now();
		const { result } = renderHook(() => useElapsed(t0, 500));

		await act(() => vi.advanceTimersByTime(500));
		expect(result.current).toBe(500);

		await act(() => vi.advanceTimersByTime(500));
		expect(result.current).toBe(1000);
	});

	// This test directly verifies that `now` must NOT be in the useEffect
	// dependency array. If it were, setInterval would be called again on every
	// tick (re-creating the interval each second). The effect only needs to
	// re-run when `intervalMs` changes, not when the derived `now` state changes.
	it('creates the interval exactly once on mount, not on each tick', async () => {
		vi.useFakeTimers();
		const spy = vi.spyOn(globalThis, 'setInterval');

		renderHook(() => useElapsed(Date.now()));
		expect(spy).toHaveBeenCalledTimes(1);

		await act(() => vi.advanceTimersByTime(5000)); // 5 ticks at 1s each
		expect(spy).toHaveBeenCalledTimes(1); // still exactly 1

		spy.mockRestore();
	});

	it('clears the interval on unmount', () => {
		vi.useFakeTimers();
		const spy = vi.spyOn(globalThis, 'clearInterval');

		const { unmount } = renderHook(() => useElapsed(Date.now()));
		unmount();

		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});

	it('does not tick after unmount', async () => {
		vi.useFakeTimers();
		const t0 = Date.now();
		const { result, unmount } = renderHook(() => useElapsed(t0));

		await act(() => vi.advanceTimersByTime(1000));
		expect(result.current).toBe(1000);

		unmount();

		// Advancing after unmount should not throw or cause a state-update warning
		await act(() => vi.advanceTimersByTime(5000));
		expect(result.current).toBe(1000); // frozen at unmount value
	});

	it('resets the interval when intervalMs changes', async () => {
		vi.useFakeTimers();
		const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
		const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

		const { rerender } = renderHook(
			({ ms }: { ms: number }) => useElapsed(Date.now(), ms),
			{ initialProps: { ms: 1000 } },
		);

		expect(setIntervalSpy).toHaveBeenCalledTimes(1);
		expect(clearIntervalSpy).toHaveBeenCalledTimes(0);

		rerender({ ms: 500 });

		// Old interval torn down, new one started at 500ms
		expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
		expect(setIntervalSpy).toHaveBeenCalledTimes(2);
		expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 500);

		setIntervalSpy.mockRestore();
		clearIntervalSpy.mockRestore();
	});
});
