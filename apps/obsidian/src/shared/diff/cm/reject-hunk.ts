import type { EditorView } from '@codemirror/view';
import { diffField } from './diff-field.js';
import { rejectHunkChange } from './changes.js';
import { setHoveredHunkEffect } from './effects.js';

export function rejectAllHunks(view: EditorView) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	const oldContent = ds.oldContent;
	const pendingHunks = ds.hunks
		.slice()
		.sort((left, right) => left.newFrom - right.newFrom);
	if (pendingHunks.length === 0) return;

	view.dispatch({
		changes: pendingHunks.map((hunk) => rejectHunkChange(oldContent, hunk)),
		effects: [setHoveredHunkEffect.of(null)],
	});
}

export function rejectHunk(view: EditorView, hunkIds: string[]) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	const oldContent = ds.oldContent;

	const hunks = ds.hunks
		.filter((hunk) => hunkIds.includes(hunk.id))
		.sort((left, right) => left.newFrom - right.newFrom);
	if (hunks.length === 0) return;

	view.dispatch({
		changes: hunks.map((hunk) => rejectHunkChange(oldContent, hunk)),
		effects: [setHoveredHunkEffect.of(null)],
	});
}
