// Must match the grid's `grid-cols-8` class so vertical moves keep their column.
// A fixed column count avoids measuring the rendered grid.
const ICON_GRID_COLUMNS = 8;

const offsets: Record<string, number> = {
	ArrowLeft: -1,
	ArrowRight: 1,
	ArrowUp: -ICON_GRID_COLUMNS,
	ArrowDown: ICON_GRID_COLUMNS,
};

// Returns undefined for keys the grid does not handle. Moves stop at the edges,
// except that ArrowDown into a shorter last row lands on its final icon.
export function moveActive(
	index: number,
	key: string,
	count: number,
): number | undefined {
	const offset = offsets[key];
	if (offset === undefined) return undefined;
	const next = index + offset;
	if (next < 0) return index;
	if (next < count) return next;
	const row = Math.floor(index / ICON_GRID_COLUMNS);
	const lastRow = Math.floor((count - 1) / ICON_GRID_COLUMNS);
	return row < lastRow ? count - 1 : index;
}
