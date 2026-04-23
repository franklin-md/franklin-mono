import type { Extension } from '../../algebra/types/index.js';
import type { CoreAPI } from '../../systems/core/index.js';
import type { StoreAPI } from '../../systems/store/index.js';
import type { StoreRuntime } from '../../systems/store/runtime.js';
import { conversationKey } from './key.js';
import { handleChunk } from './handlers/chunk.js';
import { handleToolCall } from './handlers/tool-call.js';
import { handleToolResult } from './handlers/tool-result.js';
import { handleUpdate } from './handlers/update.js';
import { handleTurnEnd } from './handlers/turn-end.js';
import { createConversationControl } from './controls.js';
import type { ConversationTurn } from './types.js';

function wrapHandler<T>(fn: (turn: ConversationTurn, event: T) => void) {
	return (event: T, ctx: StoreRuntime) => {
		const store = ctx.getStore(conversationKey);
		const control = createConversationControl(store);
		control.modifyCurrentTurn((turn) => fn(turn, event));
	};
}

/**
 * Extension that maintains a conversation transcript as a list of turns.
 *
 * Store access happens at runtime via `runtime.getStore(conversationKey)`.
 */
export function conversationExtension(): Extension<
	CoreAPI<StoreRuntime> & StoreAPI
> {
	return (api) => {
		api.registerStore(conversationKey, [], 'private');

		api.on('prompt', (prompt, ctx) => {
			const store = ctx.getStore(conversationKey);
			store.set((draft) => {
				draft.push({
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					prompt: { ...prompt.request },
					response: { blocks: [] },
				});
			});
		});

		api.on('chunk', wrapHandler(handleChunk));
		api.on('update', wrapHandler(handleUpdate));
		api.on('toolCall', wrapHandler(handleToolCall));
		api.on('toolResult', wrapHandler(handleToolResult));
		api.on('turnEnd', wrapHandler(handleTurnEnd));
	};
}
