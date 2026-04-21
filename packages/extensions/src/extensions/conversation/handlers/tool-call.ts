import type { ToolExecuteParams } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

import { startNewBlock } from './blocks/start.js';

export function handleToolCall(
	turn: ConversationTurn,
	event: ToolExecuteParams,
): void {
	startNewBlock(turn, 'toolUse', {
		call: event.call,
		result: undefined,
	});
}
