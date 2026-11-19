import type { InboxAction } from '../actions/types.js';

// Storage version 11 gives each saved action and run snapshot an icon and
// color. Keep these fixed when the editable default for new presets changes.
export function migrateActionIcon(
	action: Pick<InboxAction, 'id' | 'name' | 'prompt'>,
): InboxAction {
	return { ...action, icon: 'lucide-sparkles', color: 'blue' };
}
