import type { Ref, RefCallback } from 'react';
import { useCallback, useRef, useState } from 'react';

import { useMergeRefs } from '@franklin/react';

// --- Types ---------------------------------------------------------------

export type TextareaAutosizeHeightMeta = {
	rowHeight: number;
};

export type UseTextareaAutosizeLayoutOptions = {
	minRows?: number;
	maxRows?: number;
	ref?: Ref<HTMLTextAreaElement>;
};

export type UseTextareaAutosizeLayoutResult = {
	textareaRef: RefCallback<HTMLTextAreaElement>;
	minRows: number;
	maxRows: number | undefined;
	measuredHeight: number | null;
	visibleHeight: number | null;
	isOverflowing: boolean;
	handleHeightChange: (
		height: number,
		meta: TextareaAutosizeHeightMeta,
	) => void;
};

// --- Helpers -------------------------------------------------------------

/**
 * Non-content height contributed by padding and (for border-box) borders.
 * Needed because `rowHeight * maxRows` alone does not account for the
 * textarea's chrome.
 */
function getTextareaChromeHeight(textarea: HTMLTextAreaElement): number {
	const styles = window.getComputedStyle(textarea);
	const paddingHeight =
		Number.parseFloat(styles.paddingTop) +
		Number.parseFloat(styles.paddingBottom);
	const borderHeight =
		Number.parseFloat(styles.borderTopWidth) +
		Number.parseFloat(styles.borderBottomWidth);

	return styles.boxSizing === 'border-box'
		? paddingHeight + borderHeight
		: paddingHeight;
}

// --- Hook ----------------------------------------------------------------

export function useTextareaAutosizeLayout(
	options: UseTextareaAutosizeLayoutOptions = {},
): UseTextareaAutosizeLayoutResult {
	const { minRows = 2, maxRows, ref: externalRef } = options;

	const internalRef = useRef<HTMLTextAreaElement | null>(null);
	const textareaRef = useMergeRefs([externalRef, internalRef]);

	const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
	const [visibleHeight, setVisibleHeight] = useState<number | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	const handleHeightChange = useCallback(
		(height: number, meta: TextareaAutosizeHeightMeta) => {
			setMeasuredHeight(height);

			if (maxRows == null) {
				setVisibleHeight(height);
				setIsOverflowing(false);
				return;
			}

			const textarea = internalRef.current;
			const chromeHeight = textarea ? getTextareaChromeHeight(textarea) : 0;
			const maxVisibleHeight = meta.rowHeight * maxRows + chromeHeight;

			setVisibleHeight(Math.min(height, maxVisibleHeight));
			setIsOverflowing(height > maxVisibleHeight);
		},
		[maxRows],
	);

	return {
		textareaRef,
		minRows,
		maxRows,
		measuredHeight,
		visibleHeight,
		isOverflowing,
		handleHeightChange,
	};
}
