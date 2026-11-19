import type { z } from 'zod';
import type { InboxDocument } from '../controller/types.js';
import { ancestorsOf } from '../controller/lineage.js';
import { inboxNodes } from './nodes.js';

export function validateHierarchy(
	document: Pick<InboxDocument, 'questions' | 'groups' | 'thoughtDumps'>,
	ctx: z.RefinementCtx,
): void {
	const nodes = inboxNodes(document);
	const ids = [...nodes, ...(document.thoughtDumps ?? [])].map(
		(item) => item.id,
	);
	if (new Set(ids).size !== ids.length)
		ctx.addIssue({ code: 'custom', message: 'Duplicate inbox IDs' });
	for (const node of nodes) {
		try {
			const root = ancestorsOf(node, nodes)[0] ?? node;
			if (node.rootId !== root.id) throw new Error('Invalid root node');
		} catch {
			ctx.addIssue({ code: 'custom', message: 'Invalid inbox lineage' });
		}
	}
	const groupIds = new Set(document.groups?.map((group) => group.id));
	for (const dump of document.thoughtDumps ?? []) {
		if (dump.groupId && !groupIds.has(dump.groupId))
			ctx.addIssue({
				code: 'custom',
				message: 'Thought dump group is missing',
			});
	}
}
