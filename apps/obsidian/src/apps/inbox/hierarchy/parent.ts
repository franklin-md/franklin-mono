import type { InboxDocument } from '../controller/types.js';
import { inboxNodes } from './nodes.js';

export function childParent(document: InboxDocument, id?: string) {
	if (id === undefined) return undefined;
	const parent = inboxNodes(document).find((node) => node.id === id);
	if (!parent) throw new Error('Parent is no longer in the inbox');
	if ('state' in parent && parent.state.kind !== 'answered')
		throw new Error('Follow up on an answered question');
	return parent;
}
