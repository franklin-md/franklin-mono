import { Transaction } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import type { QuickEditState } from '../types.js';
import { filterQuickEditTransaction } from './filter.js';
import { quickEditControl } from './state.js';

export function quickEditDeletion(
	state: EditorState,
	key: 'Backspace' | 'Delete',
	definition: DirectiveDefinition<QuickEditState>,
): Transaction | null {
	if (
		state.selection.ranges.length !== 1 ||
		!state.doc.toString().includes(':::franklin:quick-edit:')
	)
		return null;
	const selection = state.selection.main;
	const from =
		selection.empty && key === 'Backspace'
			? Math.max(0, selection.from - 1)
			: selection.from;
	const to =
		selection.empty && key === 'Delete'
			? Math.min(state.doc.length, selection.to + 1)
			: selection.to;
	if (from === to) return null;
	// Only take ownership when deletion touches a control. Otherwise the host
	// retains ordinary text/grapheme deletion, list handling and key bindings.
	const deletion = state.update({
		changes: { from, to, insert: '' },
		filter: false,
		userEvent: key === 'Backspace' ? 'delete.backward' : 'delete.forward',
	});
	const change = filterQuickEditTransaction(deletion, definition);
	return change instanceof Transaction && change.annotation(quickEditControl)
		? change
		: null;
}
