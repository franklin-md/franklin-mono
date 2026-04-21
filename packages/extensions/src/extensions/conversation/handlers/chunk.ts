import type { Chunk } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

import { startNewBlock } from './blocks/start.js';

/**
 * Append a streaming chunk to the conversation store.
 *
 * Coalesces adjacent chunks of the same kind into a single open block.
 * When a chunk of a different kind arrives, startNewBlock closes the
 * previously-open block and pushes the new one at the same instant.
 */
export function handleChunk(turn: ConversationTurn, chunk: Chunk): void {
	const { content } = chunk;
	const blocks = turn.response.blocks;
	const last = blocks[blocks.length - 1];

	// TODO: This is coalescing logic based on last block. Why don't we coalesce on messageId?
	switch (content.type) {
		case 'text':
		case 'thinking': {
			const kind = content.type;
			if (last && last.kind === kind && last.endedAt === undefined) {
				last.text += content.text;
			} else {
				startNewBlock(turn, kind, { text: content.text });
			}
			break;
		}
		case 'image':
			// Image chunks are not yet supported in the conversation model
			break;
	}
}
