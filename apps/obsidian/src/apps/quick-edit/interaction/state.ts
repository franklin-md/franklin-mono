import { Annotation, StateEffect, StateField } from '@codemirror/state';
import { findQuickEditDraft } from './draft.js';

export type ComposerState = {
	id: string;
	fresh: boolean;
	pending: boolean;
	original: { anchor: number; head: number };
};

export const quickEditControl = Annotation.define<boolean>();
export const setQuickEditComposer = StateEffect.define<ComposerState | null>();
export const quickEditComposer = StateField.define<ComposerState | null>({
	create: () => null,
	update(previous, transaction) {
		let next = previous && {
			...previous,
			original: {
				anchor: transaction.changes.mapPos(previous.original.anchor, -1),
				head: transaction.changes.mapPos(previous.original.head, -1),
			},
		};
		for (const effect of transaction.effects)
			if (effect.is(setQuickEditComposer)) next = effect.value;
		if (next && !findQuickEditDraft(transaction.newDoc.toString(), next.id))
			return null;
		return next;
	},
});
