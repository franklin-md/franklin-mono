import type { IconOption } from './types.js';

// Every term must appear in the ID, label or a keyword. Icons whose ID or label
// starts with the first term rank first; ties keep the catalog order.
export function filterIcons(
	icons: readonly IconOption[],
	query: string,
): readonly IconOption[] {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const [first] = terms;
	if (!first) return icons;
	const leading: IconOption[] = [];
	const rest: IconOption[] = [];
	for (const icon of icons) {
		const id = icon.id.toLowerCase();
		const label = icon.label.toLowerCase();
		const fields = [
			id,
			label,
			...(icon.keywords ?? []).map((keyword) => keyword.toLowerCase()),
		];
		if (!terms.every((term) => fields.some((field) => field.includes(term))))
			continue;
		(id.startsWith(first) || label.startsWith(first) ? leading : rest).push(
			icon,
		);
	}
	return [...leading, ...rest];
}
