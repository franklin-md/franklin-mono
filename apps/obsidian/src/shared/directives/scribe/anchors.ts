import { StateEffect, StateField } from '@codemirror/state';

type Anchor = { id: string; from: number; to: number };
const add = StateEffect.define<Anchor>();
const remove = StateEffect.define<string>();
const field = StateField.define<ReadonlyMap<string, Anchor>>({
	create: () => new Map(),
	update(previous, transaction) {
		const next = new Map<string, Anchor>();
		for (const [id, anchor] of previous) {
			const deletions: number[] = [];
			transaction.changes.iterChangedRanges((from, to) => {
				if (to > from && from <= anchor.from && to >= anchor.to)
					deletions.push(from);
			});
			if (deletions.length === 0)
				next.set(id, {
					...anchor,
					from: transaction.changes.mapPos(anchor.from, 1),
					to: transaction.changes.mapPos(anchor.to, 1),
				});
		}
		for (const effect of transaction.effects) {
			if (effect.is(add)) next.set(effect.value.id, effect.value);
			if (effect.is(remove)) next.delete(effect.value);
		}
		return next;
	},
});

// Pending insertions follow document transactions while persistence yields.
// https://codemirror.net/docs/ref/#state.ChangeDesc.mapPos
export const directiveAnchors = { field, add, remove };
