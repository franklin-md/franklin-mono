import type {
	ToolResultEvent,
	ToolResultWithOutput,
} from '../../../modules/core/index.js';
import type { ConversationTurn } from '../types.js';

import { endBlock } from './blocks/end.js';
import { startAndEndNewBlock } from './blocks/start.js';

export function handleToolResult(
	turn: ConversationTurn,
	event: ToolResultEvent,
): void {
	const result = toolResultFromEvent(event);
	for (const block of turn.response.blocks) {
		if (block.kind === 'toolUse' && block.call.id === event.toolCallId) {
			block.result = result;
			endBlock(block);
			return;
		}
	}

	// Fallback: no matching open tool-call block. Record the result as an
	// instantaneous toolUse — startedAt and endedAt share the same moment.
	startAndEndNewBlock(turn, 'toolUse', {
		call: event.call,
		result,
	});
}

function toolResultFromEvent(event: ToolResultEvent): ToolResultWithOutput {
	const { call: _call, ...result } = event;
	return result;
}
