import { formatDirective } from '../syntax/format.js';
import type { DirectiveReference } from '../syntax/types.js';

export function countDirectives(
	references: DirectiveReference[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const { name, id } of references) {
		const key = formatDirective(name, id);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}
