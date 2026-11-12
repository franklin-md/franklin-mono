import { questionTitle } from '../title.js';
import type { StudyQuestion } from '../types.js';
import type { InboxGroup } from './types.js';

export function groupSummary(
	group: InboxGroup,
	children: ReadonlyMap<string | undefined, (StudyQuestion | InboxGroup)[]>,
) {
	let first: StudyQuestion | undefined;
	let count = 0;
	const descendants = [...(children.get(group.id) ?? [])];
	for (const node of descendants) {
		if ('state' in node) {
			count++;
			if (
				!first ||
				(node.order ?? node.createdAt) < (first.order ?? first.createdAt)
			)
				first = node;
		}
		descendants.push(...(children.get(node.id) ?? []));
	}
	return {
		// Older groups have no generated title. Reuse their saved question heading
		// without changing the context pinned by research and flashcard captures.
		title: group.title ?? (first ? questionTitle(first) : 'Untitled'),
		count,
	};
}
