import type { ToolResultEvent } from '../../../modules/core/index.js';
import type { ConversationTurn } from '../types.js';

import { endBlock } from './blocks/end.js';
import { startAndEndNewBlock } from './blocks/start.js';

export function handleToolResult(
	turn: ConversationTurn,
	event: ToolResultEvent,
): void {
	for (const block of turn.response.blocks) {
		if (block.kind === 'toolUse' && block.call.id === event.call.id) {
			block.result = event.result;
			if ('output' in event) block.output = event.output;
			endBlock(block);
			return;
		}
	}

	// Fallback: no matching open tool-call block. Record the result as an
	// instantaneous toolUse — startedAt and endedAt share the same moment.
	startAndEndNewBlock(turn, 'toolUse', {
		call: event.call,
		result: event.result,
		...('output' in event ? { output: event.output } : {}),
	});
}
