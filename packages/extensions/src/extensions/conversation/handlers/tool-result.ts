import type { ToolCall, ToolResult } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

export function handleToolResult(
	turn: ConversationTurn,
	event: ToolResult & { call: ToolCall },
): void {
	for (const block of turn.response.blocks) {
		if (block.kind === 'toolUse' && block.call.id === event.toolCallId) {
			block.result = event.content;
			return;
		}
	}

	turn.response.blocks.push({
		kind: 'toolUse',
		call: event.call,
		result: event.content,
	});
}
