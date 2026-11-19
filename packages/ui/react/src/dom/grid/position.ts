import type { GridPosition } from './types.js';

// Moves stop at the grid edges. ArrowDown into a shorter last row lands on its
// final cell, and only from a row above it. Expects `count` of at least 1.
export function gridPosition(
	index: number,
	count: number,
	columns: number,
): GridPosition {
	const last = count - 1;
	const rowStart = index - (index % columns);
	const nextRowStart = rowStart + columns;
	return {
		left: Math.max(index - 1, 0),
		right: Math.min(index + 1, last),
		up: index >= columns ? index - columns : index,
		down: nextRowStart > last ? index : Math.min(index + columns, last),
		rowStart,
		rowEnd: Math.min(rowStart + columns - 1, last),
		first: 0,
		last,
	};
}
