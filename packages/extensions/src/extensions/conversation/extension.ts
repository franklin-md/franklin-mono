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

/**
 * Extension that maintains a conversation transcript as a list of turns.
 *
 * Store access happens at runtime via `runtime.getStore(conversationKey)`.
 */
export function conversationExtension(): Extension<
	CoreAPI<StoreRuntime> & StoreAPI
> {
	return (api) => {
		const control = (ctx: StoreRuntime) =>
			createConversationControl(ctx.getStore(conversationKey));

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

		api.on('chunk', (event, ctx) => {
			control(ctx).modifyCurrentTurn((turn) => handleChunk(turn, event));
		});

		api.on('update', (event, ctx) => {
			control(ctx).modifyCurrentTurn((turn) => handleUpdate(turn, event));
		});

		api.on('toolCall', (event, ctx) => {
			control(ctx).modifyCurrentTurn((turn) => handleToolCall(turn, event));
		});

		api.on('toolResult', (event, ctx) => {
			control(ctx).modifyCurrentTurn((turn) => handleToolResult(turn, event));
		});

		api.on('turnEnd', (event, ctx) => {
			control(ctx).modifyCurrentTurn((turn) => handleTurnEnd(turn, event));
		});
	};
}
