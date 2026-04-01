import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { StoreAPI } from '../../api/store/api.js';
import { conversationKey } from './key.js';
import { handleChunk } from './handlers/chunk.js';
import { handleUpdate } from './handlers/update.js';
import { handleTurnEnd } from './handlers/turn-end.js';
import { createConversationControl } from './controls.js';

/**
 * Extension that maintains a conversation transcript as a list of turns.
 *
 * Each turn has a UserMessage and an AssistantTurn (ordered list of blocks:
 * text, thinking, toolUse, turnEnd).
 *
 * Listens to `prompt` (to record user messages), `chunk` (to stream text/thinking),
 * `update` (to record tool calls and tool results), and `turnEnd` (to record stop reasons).
 */
export function conversationExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore(conversationKey, [], 'private');
		const control = createConversationControl(store);

		api.on('prompt', (params) => {
			store.set((draft) => {
				draft.push({
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					prompt: { ...params.message },
					response: { blocks: [] },
				});
			});
		});

		api.on('chunk', (event) => {
			control.modifyCurrentTurn((turn) => handleChunk(turn, event));
		});

		api.on('update', (event) => {
			control.modifyCurrentTurn((turn) => handleUpdate(turn, event));
		});

		api.on('turnEnd', (event) => {
			control.modifyCurrentTurn((turn) => handleTurnEnd(turn, event));
		});
	};
}
