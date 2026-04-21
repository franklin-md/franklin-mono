import type { TurnEnd } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

/**
 * Handle a TurnEnd event by appending a turnEnd block.
 *
 * Always pushes a block — the UI renderer decides visibility based on
 * the stopCode (e.g. Finished may render as nothing, while errors
 * render a banner).
 */
export function handleTurnEnd(turn: ConversationTurn, event: TurnEnd): void {
	turn.response.blocks.push({
		kind: 'turnEnd',
		stopCode: event.stopCode,
		stopMessage: event.stopMessage,
		usage: event.usage,
	});
}
