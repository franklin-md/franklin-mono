import type { EditorState, Transaction } from '@codemirror/state';
import { StateEffect, StateField } from '@codemirror/state';
import { invertedEffects } from '@codemirror/commands';
import type { Hunk } from '../compute-hunks.js';
import { computeHunks } from '../compute-hunks.js';

export type DiffState = {
	oldContent: string | null;
	hunks: Hunk[];
	hoveredHunkId: string | null;
};

export const setDiffEntry = StateEffect.define<{ oldContent: string }>();
export const clearDiff = StateEffect.define();
export const setBaseline = StateEffect.define<{ oldContent: string }>();
export const setHoveredHunk = StateEffect.define<string | null>();

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
			if (effect.is(setDiffEntry) || effect.is(setBaseline)) {
				next = createDiffState(
					effect.value.oldContent,
					tr.state.doc.toString(),
				);
			} else if (effect.is(clearDiff)) {
				next = empty;
			} else if (effect.is(setHoveredHunk)) {
				if (next.hoveredHunkId !== effect.value) {
					next = { ...next, hoveredHunkId: effect.value };
				}
			}
		}

		if (tr.docChanged && next.oldContent !== null) {
			const hunks = computeHunks(next.oldContent, tr.state.doc.toString());
			next = {
				...next,
				hunks,
				hoveredHunkId: hunks.some((hunk) => hunk.id === next.hoveredHunkId)
					? next.hoveredHunkId
					: null,
			};
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

export const diffInverted = invertedEffects.of((tr) => {
	// Accept decisions mutate the baseline rather than the document.
	// Make those baseline changes part of editor undo/redo by restoring the
	// prior baseline from the transaction's start state.
	const previous = tr.startState.field(diffField, false)?.oldContent;
	const out: StateEffect<unknown>[] = [];

	for (const effect of tr.effects) {
		if (effect.is(setBaseline) && previous != null) {
			out.push(setBaseline.of({ oldContent: previous }));
		}
	}

	return out;
});

export function visibleHunks(state: EditorState): Hunk[] {
	const ds = state.field(diffField, false);
	if (!ds || ds.oldContent === null) return [];
	return ds.hunks;
}

export function reverseHunkChange(
	oldContent: string,
	hunk: Hunk,
): { from: number; to: number; insert: string } {
	return {
		from: hunk.newFrom,
		to: hunk.newTo,
		insert: oldContent.slice(hunk.oldFrom, hunk.oldTo),
	};
}

export function acceptHunkIntoBaseline(
	oldContent: string,
	newContent: string,
	hunk: Hunk,
): string {
	return (
		oldContent.slice(0, hunk.oldFrom) +
		newContent.slice(hunk.newFrom, hunk.newTo) +
		oldContent.slice(hunk.oldTo)
	);
}
