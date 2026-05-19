import type { Store } from '../../modules/store/api/types.js';
import type { ConversationTurn } from './types.js';

// TODO: Maybe the controls should just take in a StoreRuntime?
export function createConversationControl(store: Store<ConversationTurn[]>) {
	return {
		// Noop if turn doesnt exist
		modifyCurrentTurn: (modifier: (turn: ConversationTurn) => void) => {
			store.set((draft) => {
				const turn = draft[draft.length - 1];
				if (!turn) return;
				modifier(turn);
			});
		},
	};
}
