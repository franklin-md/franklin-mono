import type { Chunk } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

/**
 * Append a streaming chunk to the conversation store.
 *
 * Coalesces adjacent blocks of the same kind (text or thinking).
 * Creates an AssistantTurn on the current turn if one doesn't exist yet.
 */
export function handleChunk(turn: ConversationTurn, chunk: Chunk): void {
	const { content } = chunk;

	const blocks = turn.response.blocks;
	const last = blocks[blocks.length - 1];

	// TODO: This is coalescing logic based on last block. Why don't be coalesce on messageId?
	switch (content.type) {
		case 'text': {
			if (last && last.kind === 'text') {
				last.text += content.text;
			} else {
				blocks.push({ kind: 'text', text: content.text });
			}
			break;
		}
		case 'thinking': {
			if (last && last.kind === 'thinking') {
				last.text += content.text;
			} else {
				blocks.push({ kind: 'thinking', text: content.text });
			}
			break;
		}
		case 'image':
			// Image chunks are not yet supported in the conversation model
			break;
	}
}
