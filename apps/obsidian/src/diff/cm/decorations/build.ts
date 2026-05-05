import type { EditorState, Range } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { Decoration, EditorView } from '@codemirror/view';
import type { Hunk } from '../../compute-hunks.js';
import { diffField } from '../diff-field.js';
import { actionDecorations } from './actions.js';
import { addedLineDecorations } from './added-line.js';
import { removedLineDecorations } from './deleted-line.js';

function buildDecorations(state: EditorState): DecorationSet {
	const ds = state.field(diffField, false);
	const decorations: Range<Decoration>[] = [];
	if (!ds || ds.oldContent === null) return Decoration.none;

	const hoveredHunkId = ds.hoveredHunkId;
	const visible: Hunk[] = ds.hunks
		.slice()
		.sort(
			(left, right) =>
				left.anchor.lineIndex - right.anchor.lineIndex ||
				left.newFrom - right.newFrom,
		);

	for (const hunk of visible) {
		decorations.push(...addedLineDecorations(state.doc, hunk));
		decorations.push(...removedLineDecorations(state.doc, hunk));
		decorations.push(
			...actionDecorations(state.doc, hunk, visible, hoveredHunkId),
		);
	}

	return Decoration.set(decorations, true);
}

export const diffDecorations = StateField.define<DecorationSet>({
	create: (state) => buildDecorations(state),
	update: (value, tr) => {
		const prev = tr.startState.field(diffField, false);
		const next = tr.state.field(diffField, false);
		if (tr.docChanged || prev !== next) {
			return buildDecorations(tr.state);
		}
		return value;
	},
	provide: (field) => EditorView.decorations.from(field),
});
