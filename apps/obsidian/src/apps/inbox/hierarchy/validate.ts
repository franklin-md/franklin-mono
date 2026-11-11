import type { z } from 'zod';
import type { InboxDocument } from '../controller/types.js';
import { ancestorsOf } from '../controller/lineage.js';
import { inboxNodes } from './nodes.js';

export function validateHierarchy(
	document: InboxDocument,
	ctx: z.RefinementCtx,
): void {
	const nodes = inboxNodes(document);
	const ids = [
		...nodes,
		...(document.thoughtDumps ?? []),
		...document.actionRuns,
	].map((item) => item.id);
	if (
		new Set(ids).size !== ids.length ||
		new Set(document.actions.map((a) => a.id)).size !== document.actions.length
	)
		ctx.addIssue({ code: 'custom', message: 'Duplicate inbox IDs' });
	for (const node of nodes) {
		try {
			const root = ancestorsOf(node, nodes)[0] ?? node;
			if (node.rootId !== root.id) throw new Error('Invalid root node');
		} catch {
			ctx.addIssue({ code: 'custom', message: 'Invalid inbox lineage' });
		}
	}
	const pairs = document.actionRuns.map((run) =>
		JSON.stringify([run.question.id, run.action.id]),
	);
	if (new Set(pairs).size !== pairs.length)
		ctx.addIssue({ code: 'custom', message: 'Duplicate action runs' });
	for (const run of document.actionRuns) {
		if (
			!document.questions.some(
				(q) => q.id === run.question.id && q.state.kind === 'answered',
			)
		)
			ctx.addIssue({ code: 'custom', message: 'Action question is missing' });
	}
}
