import { createRef } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMergeRefs } from '../utils/use-merge-refs.js';

describe('useMergeRefs', () => {
	it('updates a callback ref', () => {
		const callbackRef = vi.fn();
		const { result } = renderHook(() => useMergeRefs([callbackRef]));

		const node = document.createElement('div');
		result.current(node);

		expect(callbackRef).toHaveBeenCalledWith(node);
	});

	it('updates an object ref', () => {
		const objectRef = createRef<HTMLDivElement>();
		const { result } = renderHook(() => useMergeRefs([objectRef]));

		const node = document.createElement('div');
		result.current(node);

		expect(objectRef.current).toBe(node);
	});

	it('updates multiple refs at once', () => {
		const callbackRef = vi.fn();
		const objectRef = createRef<HTMLDivElement>();
		const { result } = renderHook(() => useMergeRefs([callbackRef, objectRef]));

		const node = document.createElement('div');
		result.current(node);

		expect(callbackRef).toHaveBeenCalledWith(node);
		expect(objectRef.current).toBe(node);
	});

	it('skips undefined refs without error', () => {
		const callbackRef = vi.fn();
		const { result } = renderHook(() =>
			useMergeRefs<HTMLDivElement>([undefined, callbackRef, undefined]),
		);

		const node = document.createElement('div');
		result.current(node);

		expect(callbackRef).toHaveBeenCalledWith(node);
	});

	it('passes null on cleanup (unmount)', () => {
		const callbackRef = vi.fn();
		const objectRef = createRef<HTMLDivElement>();
		const { result } = renderHook(() => useMergeRefs([callbackRef, objectRef]));

		const node = document.createElement('div');
		result.current(node);
		result.current(null);

		expect(callbackRef).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();
	});

	it('returns a stable function when refs do not change', () => {
		const callbackRef = vi.fn();
		const { result, rerender } = renderHook(() => useMergeRefs([callbackRef]));

		const first = result.current;
		rerender();

		expect(result.current).toBe(first);
	});
});
