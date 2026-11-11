import { invertedEffects } from '@codemirror/commands';
import type { StateEffect } from '@codemirror/state';

import { setBaselineEffect } from './effects.js';
import { diffField } from './diff-field.js';

export const diffInverted = invertedEffects.of((tr) => {
	// Accept decisions mutate the baseline rather than the document.
	// Make those baseline changes part of editor undo/redo by restoring the
	// prior baseline from the transaction's start state.
	const previous = tr.startState.field(diffField, false)?.oldContent;
	const out: StateEffect<unknown>[] = [];

	for (const effect of tr.effects) {
		if (effect.is(setBaselineEffect) && previous != null) {
			out.push(setBaselineEffect.of({ oldContent: previous }));
		}
	}

	return out;
});
