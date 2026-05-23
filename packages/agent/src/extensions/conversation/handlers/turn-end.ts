import type { TurnEnd } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

import { endAllOpenBlocks, endBlock } from './blocks/end.js';
import { startBlock } from './blocks/start.js';

/**
 * Handle a TurnEnd event by appending a turnEnd block.
 *
 * Always pushes a block — the UI renderer decides visibility based on
 * the stopCode (e.g. Finished may render as nothing, while errors
 * render a banner).
 *
 * The turnEnd is instantaneous. It closes every still-open block at the same
 * moment, including overlapping tool calls that never produced a result.
 */
export function handleTurnEnd(turn: ConversationTurn, event: TurnEnd): void {
	const now = Date.now();
	endAllOpenBlocks(turn, now);
	const block = startBlock(
		turn,
		'turnEnd',
		{
			stopCode: event.stopCode,
			stopMessage: event.stopMessage,
			usage: event.usage,
		},
		now,
	);
	endBlock(block, now);
}
