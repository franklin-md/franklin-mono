import { EditorSelection } from '@codemirror/state';
import type { EditorState, TransactionSpec } from '@codemirror/state';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import { findQuickEditDraft } from './draft/find.js';
import { quickEditComposer, setQuickEditComposer } from './state.js';
import { quickEditChange } from './change.js';
import type { DirectiveInstance } from '../../../shared/directives/instance.js';
import type { QuickEditState } from '../types.js';

export function cancelQuickEdit(
	state: EditorState,
	instance?: DirectiveInstance<QuickEditState>,
): TransactionSpec | null {
	const active = state.field(quickEditComposer);
	const composer = !instance || active?.id === instance.id ? active : null;
	const saved = instance?.state.get();
	if (!composer && saved?.status !== 'ready') return null;
	const id = composer?.id ?? instance?.id;
	const fresh = composer?.fresh ?? true;
	const original = composer?.original ?? {
		anchor: 0,
		head: 0,
		text: saved?.prompt ?? '',
		baseline: saved?.selectionBaseline,
	};
	if (!id) return null;
	const draft = findQuickEditDraft(state.doc.toString(), id);
	if (!draft || composer?.pending) return null;
	const from = fresh ? draft.from : draft.promptFrom;
	const text = fresh ? original.text : '';
	const changes = state.changes({ from, to: draft.to, insert: text });
	const reversed = original.anchor > original.head;
	const baseline = state.field(diffField, false)?.oldContent;
	const baselineDraft =
		baseline == null ? undefined : findQuickEditDraft(baseline, id);
	const restoredBaseline =
		fresh &&
		original.baseline !== undefined &&
		baseline != null &&
		baselineDraft
			? baseline.slice(0, baselineDraft.from) +
				original.baseline +
				baseline.slice(baselineDraft.to)
			: undefined;
	return quickEditChange(
		state,
		[{ from, to: draft.to, text }],
		composer ? [setQuickEditComposer.of(null)] : [],
		fresh
			? EditorSelection.single(
					from + (reversed ? text.length : 0),
					from + (reversed ? 0 : text.length),
				)
			: EditorSelection.single(
					changes.mapPos(original.anchor, -1),
					changes.mapPos(original.head, -1),
				),
		restoredBaseline,
	);
}
