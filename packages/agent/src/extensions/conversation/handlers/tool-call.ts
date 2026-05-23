import type { ToolExecuteParams } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

import { endTrailingSequentialBlock } from './blocks/end.js';
import { startBlock } from './blocks/start.js';

export function handleToolCall(
	turn: ConversationTurn,
	event: ToolExecuteParams,
): void {
	const now = Date.now();
	endTrailingSequentialBlock(turn, now);
	startBlock(
		turn,
		'toolUse',
		{
			call: event.call,
			result: undefined,
		},
		now,
	);
}
