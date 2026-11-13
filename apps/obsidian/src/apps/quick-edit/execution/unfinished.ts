import type { QuickEditState } from '../types.js';

export function assertUnfinishedQuickEdit(state: QuickEditState): void {
	if (state.status === 'done')
		throw new Error('This quick edit is complete. Start a new request.');
}
