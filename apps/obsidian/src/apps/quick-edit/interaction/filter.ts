import { Transaction } from '@codemirror/state';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import { parseDirectives } from '../../../shared/directives/syntax/parse.js';
import type { QuickEditState } from '../types.js';
import { quickEditComposer, quickEditControl } from './state.js';
import { findQuickEditDraft } from './draft/find.js';
import { cancelQuickEdit } from './cancel.js';
import { quickEditChange } from './change.js';
import { promptCursor } from './draft/cursor.js';

export function filterQuickEditTransaction(
	transaction: Transaction,
	definition: DirectiveDefinition<QuickEditState>,
) {
	if (
		transaction.annotation(quickEditControl) ||
		transaction.isUserEvent('undo') ||
		transaction.isUserEvent('redo')
	)
		return transaction;
	const state = transaction.startState;
	const composer = state.field(quickEditComposer);
	if (!transaction.docChanged && (!transaction.selection || !composer))
		return transaction;
	const source = state.doc.toString();
	const draft = composer && findQuickEditDraft(source, composer.id);
	if (!transaction.docChanged) {
		const selection = transaction.newSelection;
		const caret = selection.main;
		if (
			draft &&
			selection.ranges.length === 1 &&
			caret.empty &&
			(caret.head === draft.promptFrom || caret.head === draft.promptTo)
		) {
			// Crossing an atomic marker associates the caret with that marker.
			// Both query endpoints insert into the query; draw their caret there.
			const inward = promptCursor(draft.promptFrom, caret.head);
			if (caret.assoc !== inward.main.assoc)
				return [transaction, { selection: inward, sequential: true }];
		}
		return transaction;
	}
	const deletions: { from: number; to: number }[] = [];
	const blocked: boolean[] = [];
	transaction.changes.iterChanges((from, to, _newFrom, _newTo, inserted) => {
		if (draft && composer.pending && from <= draft.to && to >= draft.from)
			blocked.push(true);
		if (!inserted.length && from < to) deletions.push({ from, to });
		if (
			draft &&
			!(from <= draft.from && to >= draft.to) &&
			((from < draft.promptFrom && to > draft.from) ||
				(from < draft.to && to > draft.promptTo))
		)
			blocked.push(true);
	});
	if (draft && composer.pending && blocked.length) return [];
	const tokens = deletions.length ? parseDirectives(source) : [];
	for (const token of tokens) {
		if (token.name !== 'quick-edit') continue;
		const candidate = findQuickEditDraft(source, token.id, tokens);
		const removesControl = deletions.some(
			({ from, to }) =>
				(from < token.to && to > token.from) ||
				(candidate && from < candidate.to && to > candidate.promptTo),
		);
		if (!removesControl) continue;
		const instance = definition.get(token.id);
		const change =
			(instance ? cancelQuickEdit(state, instance) : null) ??
			(candidate
				? null
				: quickEditChange(state, [
						{ from: token.from, to: token.to, text: '' },
					]));
		if (change)
			return state.update({
				...change,
				userEvent: transaction.annotation(Transaction.userEvent),
			});
	}
	return blocked.length ? [] : transaction;
}
