import { useEffect, useRef } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { useMergeRefs } from '../../utils/use-merge-refs.js';
import { moveInGrid } from './move.js';
import type {
	GridCellProps,
	GridHandlers,
	GridNavigation,
	GridProps,
	GridRowProps,
	UseGridNavigationOptions,
} from './types.js';

// Cells are found by role and row index rather than registered, so each
// rendered cell only needs the props from getCellProps. Pickers render ~2,000
// cells; registration or a context subscription per cell would add work to
// every keypress. Row indexes, not DOM order, locate a cell, so virtualized
// grids can leave rows out.
const CELLS = ':scope > [role="gridcell"]';

function cellAt(
	grid: HTMLElement | null,
	index: number,
	columns: number,
): HTMLElement | undefined {
	const row = grid?.querySelector(
		`[role="row"][aria-rowindex="${Math.floor(index / columns) + 1}"]`,
	);
	return row?.querySelectorAll<HTMLElement>(CELLS)[index % columns];
}

function indexOfCell(target: EventTarget, columns: number): number {
	const row = target instanceof Element ? target.parentElement : null;
	const rowIndex = Number(row?.getAttribute('aria-rowindex'));
	if (!row || !rowIndex) return -1;
	const column = Array.prototype.indexOf.call(
		row.querySelectorAll(CELLS),
		target,
	);
	return column === -1 ? -1 : (rowIndex - 1) * columns + column;
}

/**
 * Roving-focus keyboard navigation for a 2-D grid, following the WAI-ARIA grid
 * pattern (https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
 *
 * Spread `getGridProps()` on the grid element, `getRowProps(row)` on each row
 * and `getCellProps(index)` on each cell, holding `columns` cells per row in
 * index order. The active cell is the grid's single tab stop. Arrow keys, Home
 * and End (with Ctrl or Cmd for the whole grid) move focus; focusing a cell by
 * pointer also makes it active. `activeIndex` is clamped to the cells, and the
 * clamped index is returned. The active cell scrolls into view when it or the
 * cell count changes.
 *
 * A virtualized grid may render only some rows. Keep the active row rendered
 * and pass `scrollToIndex`, which replaces the hook's own scrolling. It
 * receives a cell index, and the caller maps it to what its virtualizer
 * counts. Moving to an unrendered cell scrolls to it, then focuses the cell
 * once it renders.
 *
 * Pass your own `onKeyDown` and `onFocus` through `getGridProps` and your own
 * ref through the `ref` option. Your `onKeyDown` runs first, and the grid
 * ignores a key it has prevented. Activation, such as Enter or Space, is left
 * to the caller.
 */
export function useGridNavigation<T extends HTMLElement = HTMLDivElement>({
	count,
	columns,
	activeIndex,
	onActiveIndexChange,
	ref: externalRef,
	scrollToIndex,
}: UseGridNavigationOptions<T>): GridNavigation<T> {
	const ref = useRef<T>(null);
	const gridRef = useMergeRefs([ref, externalRef]);
	const pendingFocus = useRef<number | undefined>(undefined);
	const active = Math.min(Math.max(activeIndex, 0), Math.max(count - 1, 0));

	// The count stands in for the cells: a new result set can keep the same
	// index on a cell that is scrolled out of view. Only these changes scroll,
	// so scrolling the grid by hand is not undone on the next render.
	useEffect(() => {
		if (scrollToIndex) scrollToIndex(active);
		else
			cellAt(ref.current, active, columns)?.scrollIntoView({
				block: 'nearest',
			});
	}, [active, count]);

	// Finishes a move to a cell that was not rendered yet.
	useEffect(() => {
		if (pendingFocus.current === undefined) return;
		const cell = cellAt(ref.current, pendingFocus.current, columns);
		if (!cell) return;
		pendingFocus.current = undefined;
		cell.focus();
	});

	function focusCell(index: number) {
		const cell = cellAt(ref.current, index, columns);
		if (cell) {
			pendingFocus.current = undefined;
			cell.focus();
			return;
		}
		if (!scrollToIndex) return;
		pendingFocus.current = index;
		scrollToIndex(index);
	}

	// Moving only focuses the next cell; handleFocus reports it, so each move
	// reports the new index once.
	function handleKeyDown(event: KeyboardEvent<T>) {
		const next = moveInGrid(active, event, count, columns);
		if (next === undefined) return;
		event.preventDefault();
		focusCell(next);
	}

	function handleFocus(event: FocusEvent<T>) {
		const index = indexOfCell(event.target, columns);
		if (index !== -1 && index !== active) onActiveIndexChange(index);
	}

	function getGridProps(handlers: GridHandlers<T> = {}): GridProps<T> {
		return {
			ref: gridRef,
			role: 'grid',
			'aria-rowcount': Math.ceil(count / columns),
			onKeyDown: (event) => {
				handlers.onKeyDown?.(event);
				if (!event.defaultPrevented) handleKeyDown(event);
			},
			onFocus: (event) => {
				handlers.onFocus?.(event);
				handleFocus(event);
			},
		};
	}

	function getRowProps(row: number): GridRowProps {
		return { role: 'row', 'aria-rowindex': row + 1 };
	}

	function getCellProps(index: number): GridCellProps {
		return { role: 'gridcell', tabIndex: index === active ? 0 : -1 };
	}

	return {
		activeIndex: active,
		getGridProps,
		getRowProps,
		getCellProps,
		focusCell,
	};
}
