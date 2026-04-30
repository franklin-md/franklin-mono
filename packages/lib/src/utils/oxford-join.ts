export function oxfordJoin(items: readonly string[]): string {
	const last = items.at(-1);
	if (last === undefined) return '';
	if (items.length === 1) return last;
	if (items.length === 2) return `${items[0]} and ${last}`;
	return `${items.slice(0, -1).join(', ')}, and ${last}`;
}
