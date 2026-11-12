import type {
	EditorSelection,
	StateEffect,
	EditorState,
	TransactionSpec,
} from '@codemirror/state';
import { isolateHistory } from '@codemirror/commands';
import { setBaselineEffect } from '../../../shared/diff/cm/effects.js';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import type { MarkdownEdit } from '../../../shared/obsidian/markdown/types.js';
import { quickEditControl } from './state.js';
import { editMetadataBaseline } from './baseline.js';

export function quickEditChange(
	state: EditorState,
	edits: readonly MarkdownEdit[],
	effects: StateEffect<unknown>[] = [],
	selection?: EditorSelection,
	baseline?: string,
): TransactionSpec {
	const previous = state.field(diffField, false)?.oldContent;
	const oldContent =
		baseline ??
		(previous == null
			? undefined
			: editMetadataBaseline(state.doc.toString(), previous, edits));
	return {
		changes: edits.map(({ from, to, text }) => ({ from, to, insert: text })),
		selection,
		effects:
			oldContent == null
				? effects
				: [
						...effects,
						setBaselineEffect.of({
							oldContent,
						}),
					],
		annotations: [quickEditControl.of(true), isolateHistory.of('full')],
	};
}
