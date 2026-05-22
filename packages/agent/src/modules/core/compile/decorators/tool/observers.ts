import type { ToolExecuteParams } from '@franklin/mini-acp';

import type { ToolResultEvent } from '../../../api/handlers.js';
import type { ToolObservers } from './types.js';

export function notifyToolCall(
	observers: ToolObservers,
	params: ToolExecuteParams,
): void {
	for (const observer of observers.toolCall) {
		observer(params);
	}
}

export function notifyToolResult(
	observers: ToolObservers,
	event: ToolResultEvent,
): void {
	for (const observer of observers.toolResult) {
		observer(event);
	}
}
