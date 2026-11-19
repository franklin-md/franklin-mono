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

// Cells are found by role rather than registered, so each rendered cell only
// needs the props from getCellProps. Pickers render ~1,600 cells; registration
// or a context subscription per cell would add work to every keypress.
const CELLS = ':scope > [role="row"] > [role="gridcell"]';

const ROW_PROPS: GridRowProps = { role: 'row' };

function cellsOf(grid: HTMLElement | null) {
	return grid?.querySelectorAll<HTMLElement>(CELLS);
}

/**
 * Roving-focus keyboard navigation for a 2-D grid, following the WAI-ARIA grid
 * pattern (https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
 *
 * Spread `getGridProps()` on the grid element, `getRowProps()` on each of its
 * row children and `getCellProps(index)` on each cell, holding `columns` cells
 * per row in index order. The active cell is the grid's single tab stop. Arrow
 * keys, Home and End (with Ctrl or Cmd for the whole grid) move focus;
 * focusing a cell by pointer also makes it active. `activeIndex` is clamped to
 * the cells, and the clamped index is returned. The active cell scrolls into
 * view when it or the cell count changes.
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
}: UseGridNavigationOptions<T>): GridNavigation<T> {
	const ref = useRef<T>(null);
	const gridRef = useMergeRefs([ref, externalRef]);
	const active = Math.min(Math.max(activeIndex, 0), Math.max(count - 1, 0));

	// The count stands in for the cells: a new result set can keep the same
	// index on a cell that is scrolled out of view.
	useEffect(() => {
		cellsOf(ref.current)?.[active]?.scrollIntoView({ block: 'nearest' });
	}, [active, count]);

	function focusCell(index: number) {
		cellsOf(ref.current)?.[index]?.focus();
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
		const found = cellsOf(ref.current);
		if (!found) return;
		const index = Array.prototype.indexOf.call(found, event.target);
		if (index !== -1 && index !== active) onActiveIndexChange(index);
	}

	function getGridProps(handlers: GridHandlers<T> = {}): GridProps<T> {
		return {
			ref: gridRef,
			role: 'grid',
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

	function getCellProps(index: number): GridCellProps {
		return { role: 'gridcell', tabIndex: index === active ? 0 : -1 };
	}

	return {
		activeIndex: active,
		getGridProps,
		getRowProps: () => ROW_PROPS,
		getCellProps,
		focusCell,
	};
}
