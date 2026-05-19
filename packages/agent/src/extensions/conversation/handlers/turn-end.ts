import type { TurnEnd } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

import { startAndEndNewBlock } from './blocks/start.js';

/**
 * Handle a TurnEnd event by appending a turnEnd block.
 *
 * Always pushes a block — the UI renderer decides visibility based on
 * the stopCode (e.g. Finished may render as nothing, while errors
 * render a banner).
 *
 * The turnEnd is instantaneous; startAndEndNewBlock closes any still-open
 * trailing block (text mid-stream, tool call awaiting result) at the same
 * moment.
 */
export function handleTurnEnd(turn: ConversationTurn, event: TurnEnd): void {
	startAndEndNewBlock(turn, 'turnEnd', {
		stopCode: event.stopCode,
		stopMessage: event.stopMessage,
		usage: event.usage,
	});
}
