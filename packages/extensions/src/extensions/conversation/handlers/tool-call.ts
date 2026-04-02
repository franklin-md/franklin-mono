import type { ToolExecuteParams } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

export function handleToolCall(
	turn: ConversationTurn,
	event: ToolExecuteParams,
): void {
	turn.response.blocks.push({
		kind: 'toolUse',
		call: event.call,
		result: undefined,
	});
}
