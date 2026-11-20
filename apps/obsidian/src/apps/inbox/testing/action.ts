import type { InboxAction } from '../actions/types.js';

export function testAction(
	id: string,
	name: string,
	prompt: string,
): InboxAction {
	return { id, name, prompt, icon: 'lucide-layers', color: 'purple' };
}

// Adds the action, or replaces the saved action with the same ID.
export function upsertAction(action: InboxAction) {
	return (actions: InboxAction[]): InboxAction[] =>
		actions.some((item) => item.id === action.id)
			? actions.map((item) => (item.id === action.id ? action : item))
			: [...actions, action];
}
