// Splits items into rows of `columns`, as the grid pattern's row elements need.
export function toRows<T>(items: readonly T[], columns: number): T[][] {
	const rows: T[][] = [];
	for (let start = 0; start < items.length; start += columns) {
		rows.push(items.slice(start, start + columns));
	}
	return rows;
}
