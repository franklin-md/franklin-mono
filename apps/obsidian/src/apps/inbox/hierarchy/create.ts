import type { GroupInput, InboxGroup, InboxNode } from './types.js';

export function createGroup(input: GroupInput, parent?: InboxNode): InboxGroup {
	const id = crypto.randomUUID();
	return {
		kind: 'group',
		id,
		rootId: parent?.rootId ?? id,
		parentId: parent?.id,
		createdAt: Date.now(),
		folded: false,
		title: input.title?.trim() || undefined,
		context: input.context,
		source: input.source ?? parent?.source,
	};
}
