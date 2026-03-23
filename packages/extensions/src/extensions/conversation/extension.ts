import type { AssistantMessage, Chunk } from '@franklin/mini-acp';
import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { StoreAPI } from '../../api/store/api.js';
import type { Store } from '../../api/store/types.js';
import type { ConversationTurn } from './types.js';
import { conversationKey } from './key.js';

/**
 * Extension that maintains a conversation transcript as a list of turns,
 * where each turn contains Message objects from mini-acp.
 *
 * Listens to `prompt` (to record user messages) and `chunk`
 * (to build up assistant messages). Streaming chunks with the same
 * `messageId` are coalesced into a single AssistantMessage.
 */
export function conversationExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore(conversationKey, [], 'private');

		// Track messageId → message index within the current turn
		const messageIndex = new Map<string, number>();

		api.on('prompt', (params) => {
			messageIndex.clear();
			store.set((draft) => {
				draft.push({
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					messages: [{ ...params.message }],
				});
			});
		});

		api.on('chunk', (event) => {
			appendChunk(store, event, messageIndex);
		});
	};
}

/**
 * Dispatch a chunk event into the conversation store.
 * Coalesces content blocks into an AssistantMessage by messageId.
 */
function appendChunk(
	store: Store<ConversationTurn[]>,
	chunk: Chunk,
	messageIndex: Map<string, number>,
): void {
	const { content, messageId } = chunk;

	store.set((draft) => {
		const turn = draft[draft.length - 1];
		if (!turn) return;

		// Try to find an existing assistant message with this messageId
		const existingIdx = messageIndex.get(messageId);
		if (existingIdx !== undefined) {
			const msg = turn.messages[existingIdx];
			if (msg && msg.role === 'assistant') {
				msg.content.push(content);
				return;
			}
		}

		// Create a new assistant message
		const newMsg: AssistantMessage = {
			role: 'assistant',
			content: [content],
		};
		const idx = turn.messages.length;
		turn.messages.push(newMsg);
		messageIndex.set(messageId, idx);
	});
}
