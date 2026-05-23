import type { AssistantBlock, ConversationTurn } from '../../types.js';

/**
 * Close a specific block's lifecycle. Idempotent — no-op if the block
 * is already closed.
 */
export function endBlock(block: AssistantBlock, at: number = Date.now()): void {
	if (block.endedAt === undefined) block.endedAt = at;
}

/**
 * Close the trailing block's lifecycle if it is still open. No-op when
 * the turn has no blocks, or when the trailing block is already closed.
 */
export function endLastBlock(
	turn: ConversationTurn,
	at: number = Date.now(),
): void {
	const blocks = turn.response.blocks;
	const last = blocks[blocks.length - 1];
	if (last) endBlock(last, at);
}

export function endTrailingSequentialBlock(
	turn: ConversationTurn,
	at: number = Date.now(),
): void {
	const blocks = turn.response.blocks;
	const last = blocks[blocks.length - 1];
	if (last && isSequentialBlock(last)) endBlock(last, at);
}

export function endAllOpenBlocks(
	turn: ConversationTurn,
	at: number = Date.now(),
): void {
	for (const block of turn.response.blocks) {
		endBlock(block, at);
	}
}

function isSequentialBlock(block: AssistantBlock): boolean {
	switch (block.kind) {
		case 'text':
		case 'thinking':
			return true;
		case 'toolUse':
		case 'turnEnd':
			return false;
	}
}
