import type { Extension } from '../../algebra/types/index.js';
import type { CoreAPI } from '../../systems/core/index.js';
import type { StoreAPI } from '../../systems/store/index.js';
import { conversationKey } from './key.js';
import { handleChunk } from './handlers/chunk.js';
import { handleToolCall } from './handlers/tool-call.js';
import { handleToolResult } from './handlers/tool-result.js';
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
 * `update` (to reconcile authoritative assistant messages), `toolCall`/`toolResult`
 * (to record tool usage), and `turnEnd` (to record stop reasons).
 */
export function conversationExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore(conversationKey, [], 'private');
		const control = createConversationControl(store);

		api.on('prompt', (message) => {
			store.set((draft) => {
				draft.push({
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					prompt: { ...message },
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

		api.on('toolCall', (event) => {
			control.modifyCurrentTurn((turn) => handleToolCall(turn, event));
		});

		api.on('toolResult', (event) => {
			control.modifyCurrentTurn((turn) => handleToolResult(turn, event));
		});

		api.on('turnEnd', (event) => {
			control.modifyCurrentTurn((turn) => handleTurnEnd(turn, event));
		});
	};
}
