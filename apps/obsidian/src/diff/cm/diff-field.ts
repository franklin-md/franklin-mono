import type { EditorState, Transaction } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import type { Hunk } from '../compute-hunks.js';
import { computeHunks } from '../compute-hunks.js';

import {
	setBaselineEffect,
	setDiffEffect,
	setHoveredHunkEffect,
	clearDiffEffect,
} from './effects.js';

export type DiffState = {
	oldContent: string | null;
	hunks: Hunk[];
	hoveredHunkId: string | null;
};

const empty: DiffState = {
	oldContent: null,
	hunks: [],
	hoveredHunkId: null,
};

export const diffField = StateField.define<DiffState>({
	create: () => empty,

	update(value, tr: Transaction): DiffState {
		let next = value;

		for (const effect of tr.effects) {
			if (effect.is(setDiffEffect) || effect.is(setBaselineEffect)) {
				next = createDiffState(
					effect.value.oldContent,
					tr.state.doc.toString(),
				);
			} else if (effect.is(clearDiffEffect)) {
				next = empty;
			} else if (effect.is(setHoveredHunkEffect)) {
				if (next.hoveredHunkId !== effect.value) {
					next = { ...next, hoveredHunkId: effect.value };
				}
			}
		}

		if (tr.docChanged && next.oldContent !== null) {
			next = updateDiffState(next, next.oldContent, tr.state.doc.toString());
		}

		return next;
	},
});

function createDiffState(
	oldContent: string,
	currentContent: string,
): DiffState {
	return {
		oldContent,
		hunks: computeHunks(oldContent, currentContent),
		hoveredHunkId: null,
	};
}

function updateDiffState(
	prev: DiffState,
	oldContent: string,
	currentContent: string,
) {
	const hunks = computeHunks(oldContent, currentContent);
	return {
		...prev,
		hunks,
		hoveredHunkId: hunks.some((hunk) => hunk.id === prev.hoveredHunkId)
			? prev.hoveredHunkId
			: null,
	};
}

export function visibleHunks(state: EditorState): Hunk[] {
	const ds = state.field(diffField, false);
	if (!ds || ds.oldContent === null) return [];
	return ds.hunks;
}
