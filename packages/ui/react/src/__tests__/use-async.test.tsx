import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAsync } from '../utils/use-async.js';

/** Creates a deferred promise whose resolution the test controls. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe('useAsync', () => {
	// -------------------------------------------------------------------
	// Basic resolution
	// -------------------------------------------------------------------

	it('returns undefined before the promise resolves (no initial)', async () => {
		const d = deferred<string>();
		const { result } = renderHook(() => useAsync(() => d.promise, []));

		expect(result.current).toBeUndefined();

		await act(async () => d.resolve('hello'));
		expect(result.current).toBe('hello');
	});

	it('returns the initial value before the promise resolves', async () => {
		const d = deferred<number[]>();
		const { result } = renderHook(() => useAsync(() => d.promise, [], []));

		expect(result.current).toEqual([]);

		await act(async () => d.resolve([1, 2, 3]));
		expect(result.current).toEqual([1, 2, 3]);
	});

	// -------------------------------------------------------------------
	// Cancellation
	// -------------------------------------------------------------------

	it('ignores a stale promise when deps change before it resolves', async () => {
		const first = deferred<string>();
		const second = deferred<string>();
		let call = 0;

		const { result, rerender } = renderHook(
			({ dep }: { dep: number }) =>
				useAsync(
					() => (call++ === 0 ? first.promise : second.promise),
					'init',
					[dep],
				),
			{ initialProps: { dep: 0 } },
		);

		expect(result.current).toBe('init');

		// Change deps → first promise is now stale
		rerender({ dep: 1 });

		// Resolve both — only the second should take effect
		await act(async () => {
			first.resolve('stale');
			second.resolve('fresh');
		});

		expect(result.current).toBe('fresh');
	});

	it('ignores a stale promise on unmount', async () => {
		const d = deferred<string>();
		const fn = vi.fn(() => d.promise);

		const { result, unmount } = renderHook(() => useAsync(fn, []));
		expect(result.current).toBeUndefined();

		unmount();

		// Resolving after unmount should not throw or update
		await act(async () => d.resolve('too late'));
	});

	// -------------------------------------------------------------------
	// Deps trigger re-fetch
	// -------------------------------------------------------------------

	it('re-fetches when deps change', async () => {
		const fn = vi.fn(async (n: number) => n * 10);

		const { result, rerender } = renderHook(
			({ dep }: { dep: number }) => useAsync(() => fn(dep), 0, [dep]),
			{ initialProps: { dep: 1 } },
		);

		await act(async () => {});
		expect(result.current).toBe(10);

		rerender({ dep: 2 });
		await act(async () => {});
		expect(result.current).toBe(20);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	// -------------------------------------------------------------------
	// Inline fn stability — must NOT cause re-fetches
	// -------------------------------------------------------------------

	it('does not re-fetch when an inline fn changes identity but deps are stable', async () => {
		const fn = vi.fn(async () => 'value');

		const { result, rerender } = renderHook(() => useAsync(() => fn(), []));

		await act(async () => {});
		expect(result.current).toBe('value');
		expect(fn).toHaveBeenCalledTimes(1);

		// Re-render with a brand new inline arrow — deps are still []
		rerender();
		rerender();
		rerender();

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('uses the latest fn when deps do change', async () => {
		let captured = '';

		const { result, rerender } = renderHook(
			({ label }: { label: string }) =>
				useAsync(
					async () => {
						captured = label;
						return label;
					},
					'',
					[label],
				),
			{ initialProps: { label: 'a' } },
		);

		await act(async () => {});
		expect(result.current).toBe('a');
		expect(captured).toBe('a');

		rerender({ label: 'b' });
		await act(async () => {});
		expect(result.current).toBe('b');
		expect(captured).toBe('b');
	});
});
