import type { InboxDocument } from '../controller/types.js';
import { inboxNodes } from './nodes.js';

export function nextNodeOrder(
	document: Pick<InboxDocument, 'questions' | 'groups'>,
): number {
	// Millisecond timestamps can tie across a question and a group. Keep a separate
	// monotonic order so sibling placement never depends on which collection owns it.
	return inboxNodes(document).reduce(
		(order, node) => Math.max(order, (node.order ?? node.createdAt) + 1),
		Date.now(),
	);
}
