import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useObservedState } from '../utils/use-observed-state.js';

describe('useObservedState', () => {
	it('reads the initial value on mount', async () => {
		const subscribe = () => () => {};
		const read = vi.fn(async () => 'loaded');
		const apply = vi.fn(async () => {});
		const { result } = renderHook(() =>
			useObservedState(subscribe, read, apply, 'initial'),
		);

		expect(result.current.value).toBe('initial');

		await waitFor(() => {
			expect(result.current.value).toBe('loaded');
		});
	});

	it('re-reads state when the observer emits', async () => {
		let listener: (() => void) | undefined;
		let current = 'loaded';
		const subscribe = (next: () => void) => {
			listener = next;
			return () => {
				listener = undefined;
			};
		};
		const read = vi.fn(async () => current);
		const apply = vi.fn(async () => {});
		const { result } = renderHook(() =>
			useObservedState(subscribe, read, apply, 'initial'),
		);

		await waitFor(() => {
			expect(result.current.value).toBe('loaded');
		});

		act(() => {
			current = 'updated';
			listener?.();
		});

		await waitFor(() => {
			expect(result.current.value).toBe('updated');
		});
	});

	it('applies writes without updating before the observer emits', async () => {
		let listener: (() => void) | undefined;
		let current = 'initial';
		const subscribe = (next: () => void) => {
			listener = next;
			return () => {
				listener = undefined;
			};
		};
		const read = vi.fn(async () => current);
		const apply = vi.fn(async (next: string) => {
			current = next;
		});
		const { result } = renderHook(() =>
			useObservedState(subscribe, read, apply, 'initial'),
		);

		await act(async () => {
			await result.current.set('next');
		});

		expect(result.current.value).toBe('initial');
		expect(apply).toHaveBeenCalledWith('next');

		act(() => {
			listener?.();
		});

		await waitFor(() => {
			expect(result.current.value).toBe('next');
		});
	});

	it('unsubscribes on unmount', () => {
		const unsubscribe = vi.fn();
		const subscribe = () => unsubscribe;
		const read = vi.fn(async () => 'initial');
		const apply = vi.fn(async () => {});
		const { unmount } = renderHook(() =>
			useObservedState(subscribe, read, apply, 'initial'),
		);

		unmount();

		expect(unsubscribe).toHaveBeenCalledOnce();
	});
});
