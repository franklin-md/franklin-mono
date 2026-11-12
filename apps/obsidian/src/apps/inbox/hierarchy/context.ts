import type { InboxDocument, InboxQuestion } from '../controller/types.js';
import { ancestorsOf } from '../controller/lineage.js';
import { inboxNodes } from './nodes.js';
import type { BranchContext, InboxGroup, InboxNode } from './types.js';

export function branchContext(
	question: InboxQuestion,
	document: Pick<InboxDocument, 'questions' | 'groups'>,
): BranchContext {
	const ancestors = ancestorsOf<InboxNode>(question, inboxNodes(document));
	const groups = ancestors.filter(
		(node): node is InboxGroup => !('state' in node),
	);
	return {
		ancestors: ancestors.filter(
			(node): node is InboxQuestion => 'state' in node,
		),
		...(groups.length ? { groups } : {}),
	};
}
