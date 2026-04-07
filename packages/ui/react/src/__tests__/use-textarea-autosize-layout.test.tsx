// @vitest-environment jsdom

import { createRef } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTextareaAutosizeLayout } from '../dom/use-textarea-autosize-layout.js';

// Stub getComputedStyle so getTextareaChromeHeight works in jsdom.
function stubComputedStyle(overrides: Record<string, string> = {}) {
	const defaults: Record<string, string> = {
		paddingTop: '0',
		paddingBottom: '0',
		borderTopWidth: '0',
		borderBottomWidth: '0',
		boxSizing: 'content-box',
	};
	const merged = Object.assign(defaults, overrides);
	vi.spyOn(window, 'getComputedStyle').mockReturnValue(
		merged as unknown as CSSStyleDeclaration,
	);
}

describe('useTextareaAutosizeLayout', () => {
	it('returns sensible defaults before any height change', () => {
		const { result } = renderHook(() => useTextareaAutosizeLayout());

		expect(result.current.minRows).toBe(2);
		expect(result.current.maxRows).toBeUndefined();
		expect(result.current.measuredHeight).toBeNull();
		expect(result.current.visibleHeight).toBeNull();
		expect(result.current.isOverflowing).toBe(false);
		expect(typeof result.current.textareaRef).toBe('function');
		expect(typeof result.current.handleHeightChange).toBe('function');
	});

	it('passes through custom minRows', () => {
		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ minRows: 5 }),
		);
		expect(result.current.minRows).toBe(5);
	});

	it('passes through maxRows', () => {
		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 8 }),
		);
		expect(result.current.maxRows).toBe(8);
	});

	// --- Height change without maxRows ------------------------------------

	it('sets visibleHeight = measuredHeight when no maxRows', () => {
		const { result } = renderHook(() => useTextareaAutosizeLayout());

		act(() => {
			result.current.handleHeightChange(120, { rowHeight: 20 });
		});

		expect(result.current.measuredHeight).toBe(120);
		expect(result.current.visibleHeight).toBe(120);
		expect(result.current.isOverflowing).toBe(false);
	});

	it('never overflows when no maxRows, even with large height', () => {
		const { result } = renderHook(() => useTextareaAutosizeLayout());

		act(() => {
			result.current.handleHeightChange(9999, { rowHeight: 20 });
		});

		expect(result.current.isOverflowing).toBe(false);
		expect(result.current.visibleHeight).toBe(9999);
	});

	// --- Height change with maxRows (no chrome) ---------------------------

	it('clamps visibleHeight and sets isOverflowing when exceeding maxRows', () => {
		stubComputedStyle();

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 4 }),
		);

		// Attach a real textarea so the ref resolves.
		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		// 4 rows * 20px = 80px max. Content is 120px → overflow.
		act(() => {
			result.current.handleHeightChange(120, { rowHeight: 20 });
		});

		expect(result.current.measuredHeight).toBe(120);
		expect(result.current.visibleHeight).toBe(80);
		expect(result.current.isOverflowing).toBe(true);
	});

	it('does not overflow when content fits within maxRows', () => {
		stubComputedStyle();

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 6 }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		// 6 rows * 20px = 120px max. Content is exactly 120px.
		act(() => {
			result.current.handleHeightChange(120, { rowHeight: 20 });
		});

		expect(result.current.visibleHeight).toBe(120);
		expect(result.current.isOverflowing).toBe(false);
	});

	it('does not overflow when content is smaller than maxRows', () => {
		stubComputedStyle();

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 10 }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		act(() => {
			result.current.handleHeightChange(60, { rowHeight: 20 });
		});

		expect(result.current.visibleHeight).toBe(60);
		expect(result.current.isOverflowing).toBe(false);
	});

	// --- Chrome height compensation --------------------------------------

	it('accounts for padding in content-box mode', () => {
		stubComputedStyle({
			paddingTop: '8',
			paddingBottom: '8',
			boxSizing: 'content-box',
		});

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 4 }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		// maxVisible = 4 * 20 + 16 (padding) = 96
		act(() => {
			result.current.handleHeightChange(120, { rowHeight: 20 });
		});

		expect(result.current.visibleHeight).toBe(96);
		expect(result.current.isOverflowing).toBe(true);
	});

	it('accounts for padding + border in border-box mode', () => {
		stubComputedStyle({
			paddingTop: '8',
			paddingBottom: '8',
			borderTopWidth: '1',
			borderBottomWidth: '1',
			boxSizing: 'border-box',
		});

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 4 }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		// maxVisible = 4 * 20 + 16 (padding) + 2 (border) = 98
		act(() => {
			result.current.handleHeightChange(120, { rowHeight: 20 });
		});

		expect(result.current.visibleHeight).toBe(98);
		expect(result.current.isOverflowing).toBe(true);
	});

	// --- Ref merging ------------------------------------------------------

	it('merges external ref object with internal ref', () => {
		const externalRef = createRef<HTMLTextAreaElement>();

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ ref: externalRef }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		expect(externalRef.current).toBe(textarea);
	});

	it('calls external ref callback', () => {
		const callbackRef = vi.fn();

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ ref: callbackRef }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		expect(callbackRef).toHaveBeenCalledWith(textarea);
	});

	// --- Transition from overflowing to not overflowing -------------------

	it('transitions from overflowing back to not overflowing', () => {
		stubComputedStyle();

		const { result } = renderHook(() =>
			useTextareaAutosizeLayout({ maxRows: 4 }),
		);

		const textarea = document.createElement('textarea');
		act(() => {
			result.current.textareaRef(textarea);
		});

		// Overflow
		act(() => {
			result.current.handleHeightChange(200, { rowHeight: 20 });
		});
		expect(result.current.isOverflowing).toBe(true);

		// Shrink back
		act(() => {
			result.current.handleHeightChange(60, { rowHeight: 20 });
		});
		expect(result.current.isOverflowing).toBe(false);
		expect(result.current.visibleHeight).toBe(60);
	});
});
