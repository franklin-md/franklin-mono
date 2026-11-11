import type { InboxQuestion } from './types.js';

export function ancestorsOf(
	question: InboxQuestion,
	questions: InboxQuestion[],
): InboxQuestion[] {
	const chain: InboxQuestion[] = [];
	const visited = new Set([question.id]);
	let id = question.parentId;
	while (id) {
		if (visited.has(id)) throw new Error('Question lineage contains a cycle');
		visited.add(id);
		const parent = questions.find((item) => item.id === id);
		if (!parent) throw new Error('Parent question is missing');
		chain.unshift(parent);
		id = parent.parentId;
	}
	return chain;
}
