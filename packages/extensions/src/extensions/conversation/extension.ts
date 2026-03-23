import type { Chunk, UserContent } from '@franklin/mini-acp';
import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { StoreAPI } from '../../api/store/api.js';
import type { Store } from '../../api/store/types.js';
import type {
	AgentTextEntry,
	AgentThoughtEntry,
	ConversationTurn,
} from './types.js';

/**
 * Extension that maintains a flat, coalesced conversation transcript.
 *
 * Listens to `prompt` (to record user messages) and `chunk`
 * (to record agent text, thoughts, and tool calls). Streaming chunks
 * with the same `messageId` are coalesced into single entries.
 *
 * Exposes a `conversation` store for UI binding.
 */
export function conversationExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore<ConversationTurn[]>(
			'conversation',
			[],
			'private',
		);

		api.on('prompt', (params) => {
			store.set((draft) => {
				draft.push({
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					entries: [
						{
							type: 'user',
							content: [...(params.message.content as UserContent[])],
						},
					],
				});
			});
		});

		api.on('chunk', (event) => {
			appendChunk(store, event);
		});
	};
}

/**
 * Dispatch a chunk event into the conversation store.
 * Routes by content type to the appropriate entry kind.
 */
function appendChunk(store: Store<ConversationTurn[]>, chunk: Chunk): void {
	const { content, messageId } = chunk;

	switch (content.type) {
		case 'text':
			coalesceEntry(store, 'text', content, messageId);
			break;
		case 'thinking':
			coalesceEntry(store, 'thought', content, messageId);
			break;
		case 'toolCall':
			store.set((draft) => {
				const turn = draft[draft.length - 1];
				if (!turn) return;
				turn.entries.push({
					type: 'toolCall',
					id: content.id,
					name: content.name,
					arguments: content.arguments,
				});
			});
			break;
		case 'image':
			// Images are not coalesced — create a new text-like entry
			coalesceEntry(store, 'text', content, messageId);
			break;
	}
}

/**
 * Coalesces a content block into the latest turn. If an entry with the
 * same `messageId` exists, appends to it; otherwise creates a new entry.
 */
function coalesceEntry(
	store: Store<ConversationTurn[]>,
	type: 'text' | 'thought',
	content: Chunk['content'],
	messageId: string,
): void {
	store.set((draft) => {
		const turn = draft[draft.length - 1];
		if (!turn) return;

		// Try to coalesce with an existing entry by messageId
		for (let i = turn.entries.length - 1; i >= 0; i--) {
			const entry = turn.entries[i];
			if (
				entry &&
				(entry.type === 'text' || entry.type === 'thought') &&
				entry.messageId === messageId
			) {
				entry.content.push(content);
				return;
			}
		}

		// No existing entry — create one
		turn.entries.push({
			type,
			messageId,
			content: [content],
		} as AgentTextEntry | AgentThoughtEntry);
	});
}
