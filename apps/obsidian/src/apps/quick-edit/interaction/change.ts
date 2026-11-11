import type { EditorView } from '@codemirror/view';
import type { EditorSelection, StateEffect } from '@codemirror/state';
import { isolateHistory } from '@codemirror/commands';
import { setBaselineEffect } from '../../../shared/diff/cm/effects.js';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import type { MarkdownEdit } from '../../../shared/obsidian/markdown/types.js';
import { quickEditControl } from './state.js';
import { editMetadataBaseline } from './baseline.js';

export function changeQuickEdit(
	view: EditorView,
	edits: readonly MarkdownEdit[],
	effects: StateEffect<unknown>[] = [],
	selection?: EditorSelection,
): void {
	const baseline = view.state.field(diffField, false)?.oldContent;
	view.dispatch({
		changes: edits.map(({ from, to, text }) => ({ from, to, insert: text })),
		selection,
		effects:
			baseline == null
				? effects
				: [
						...effects,
						setBaselineEffect.of({
							oldContent: editMetadataBaseline(
								view.state.doc.toString(),
								baseline,
								edits,
							),
						}),
					],
		annotations: [quickEditControl.of(true), isolateHistory.of('full')],
	});
}
