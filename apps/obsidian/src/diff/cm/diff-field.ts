import type { EditorState, Transaction } from '@codemirror/state';
import { StateField, StateEffect } from '@codemirror/state';
import { invertedEffects } from '@codemirror/commands';
import { computeHunks, type Hunk } from '../compute-hunks.js';

export type HunkStatus = 'pending' | 'accepted' | 'rejected';

export type DiffState = {
	oldContent: string | null;
	hunks: Hunk[];
	status: Map<string, HunkStatus>;
	hoveredHunkId: string | null;
};

export const setDiffEntry = StateEffect.define<{ oldContent: string }>();
export const clearDiff = StateEffect.define();
export const acceptHunkEffect = StateEffect.define<string>();
export const unacceptHunkEffect = StateEffect.define<string>();
export const rejectHunkEffect = StateEffect.define<string>();
export const unrejectHunkEffect = StateEffect.define<string>();
export const setHoveredHunkEffect = StateEffect.define<string | null>();

const empty: DiffState = {
	oldContent: null,
	hunks: [],
	status: new Map(),
	hoveredHunkId: null,
};

export const diffField = StateField.define<DiffState>({
	create: () => empty,

	update(value, tr: Transaction): DiffState {
		let next = value;

		for (const e of tr.effects) {
			if (e.is(setDiffEntry)) {
				const oldContent = e.value.oldContent;
				const hunks = computeHunks(oldContent, tr.state.doc.toString());
				next = {
					oldContent,
					hunks,
					status: pendingStatus(hunks),
					hoveredHunkId: null,
				};
			} else if (e.is(clearDiff)) {
				next = empty;
			} else if (e.is(acceptHunkEffect)) {
				next = withStatus(next, e.value, 'accepted');
			} else if (e.is(unacceptHunkEffect)) {
				next = withStatus(next, e.value, 'pending');
			} else if (e.is(rejectHunkEffect)) {
				next = withStatus(next, e.value, 'rejected');
			} else if (e.is(unrejectHunkEffect)) {
				next = withStatus(next, e.value, 'pending');
			} else if (e.is(setHoveredHunkEffect)) {
				if (next.hoveredHunkId !== e.value) {
					next = { ...next, hoveredHunkId: e.value };
				}
			}
		}

		if (tr.docChanged && next.oldContent !== null) {
			const hunks = computeHunks(next.oldContent, tr.state.doc.toString());
			const status = new Map<string, HunkStatus>();
			for (const h of hunks) {
				status.set(h.id, next.status.get(h.id) ?? 'pending');
			}
			const hoveredHunkId =
				next.hoveredHunkId && status.get(next.hoveredHunkId) === 'pending'
					? next.hoveredHunkId
					: null;
			next = { ...next, hunks, status, hoveredHunkId };
		}

		return next;
	},
});

function pendingStatus(hunks: Hunk[]): Map<string, HunkStatus> {
	const m = new Map<string, HunkStatus>();
	for (const h of hunks) m.set(h.id, 'pending');
	return m;
}

function withStatus(
	state: DiffState,
	id: string,
	status: HunkStatus,
): DiffState {
	if (!state.status.has(id)) return state;
	const next = new Map(state.status);
	next.set(id, status);
	const hoveredHunkId =
		state.hoveredHunkId === id && status !== 'pending'
			? null
			: state.hoveredHunkId;
	return { ...state, status: next, hoveredHunkId };
}

export const diffInvertedEffects = invertedEffects.of((tr) => {
	const out: StateEffect<unknown>[] = [];
	for (const e of tr.effects) {
		if (e.is(acceptHunkEffect)) out.push(unacceptHunkEffect.of(e.value));
		else if (e.is(unacceptHunkEffect)) out.push(acceptHunkEffect.of(e.value));
		else if (e.is(rejectHunkEffect)) out.push(unrejectHunkEffect.of(e.value));
		else if (e.is(unrejectHunkEffect)) out.push(rejectHunkEffect.of(e.value));
	}
	return out;
});

export function visibleHunks(state: EditorState): Hunk[] {
	const ds = state.field(diffField, false);
	if (!ds || ds.oldContent === null) return [];
	return ds.hunks.filter((h) => ds.status.get(h.id) === 'pending');
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
