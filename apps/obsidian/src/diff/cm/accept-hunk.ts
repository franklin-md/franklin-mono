import type { EditorView } from '@codemirror/view';
import { diffField } from './diff-field.js';
import { setBaselineEffect, setHoveredHunkEffect } from './effects.js';
import type { Hunk } from '../compute-hunks.js';
import { acceptHunkChange } from './changes.js';

export function acceptAllHunks(view: EditorView) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	if (ds.hunks.length === 0) return;

	view.dispatch({
		effects: [
			setBaselineEffect.of({ oldContent: view.state.doc.toString() }),
			setHoveredHunkEffect.of(null),
		],
	});
}

export function acceptHunk(view: EditorView, hunk: Hunk) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;

	const oldContent = ds.oldContent;
	const newContent = view.state.doc.toString();

	view.dispatch({
		effects: [
			setBaselineEffect.of({
				oldContent: acceptHunkChange(oldContent, newContent, hunk),
			}),
			setHoveredHunkEffect.of(null),
		],
	});
}
