import type { ConversationTurn } from './types.js';

type ConversationControl = {
	modifyCurrentTurn(modifier: (turn: ConversationTurn) => void): void;
};

type ConversationControlStore = {
	set(recipe: (draft: ConversationTurn[]) => void): void;
};

export function createConversationControl(
	store: ConversationControlStore,
): ConversationControl {
	return {
		// Noop if turn doesnt exist
		modifyCurrentTurn: (modifier: (turn: ConversationTurn) => void) => {
			store.set((draft: ConversationTurn[]) => {
				const turn = draft[draft.length - 1];
				if (!turn) return;
				modifier(turn);
			});
		},
	};
}
