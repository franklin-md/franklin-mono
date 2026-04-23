import type { ToolCall, ToolResult } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

import { endBlock } from './blocks/end.js';
import { startAndEndNewBlock } from './blocks/start.js';

export function handleToolResult(
	turn: ConversationTurn,
	event: ToolResult & { call: ToolCall },
): void {
	for (const block of turn.response.blocks) {
		if (block.kind === 'toolUse' && block.call.id === event.toolCallId) {
			block.result = event.content;
			block.isError = event.isError;
			endBlock(block);
			return;
		}
	}

	// Fallback: no matching open tool-call block. Record the result as an
	// instantaneous toolUse — startedAt and endedAt share the same moment.
	startAndEndNewBlock(turn, 'toolUse', {
		call: event.call,
		result: event.content,
		isError: event.isError,
	});
}
