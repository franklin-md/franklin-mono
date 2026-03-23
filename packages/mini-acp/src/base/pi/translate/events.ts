// ---------------------------------------------------------------------------
// AgentEvent → StreamEvent translation
// ---------------------------------------------------------------------------

import type {
	Message as PiMessage,
	AssistantMessageEvent,
} from '@mariozechner/pi-ai';
import type { AgentEvent } from '@mariozechner/pi-agent-core';

import { fromPiMessage } from './message.js';
import type { StreamEvent } from 'packages/mini-acp/src/types/stream.js';

// ---------------------------------------------------------------------------
// AgentEvent → StreamEvent
// ---------------------------------------------------------------------------

export function fromAgentEvent(
	event: AgentEvent,
	messageId: string,
): StreamEvent | null {
	switch (event.type) {
		// TODO: The agent_end may emit the stopReason = error because of no APIKey for example

		case 'turn_start':
			return {
				type: 'turnStart',
			};
		case 'turn_end':
			return {
				type: 'turnEnd',
				// TODO: maybe emit the stopReason? Is that here or is it in agent lifecycle?
				// What is the difference between turn lifecycle and agent lifecycle?
			};
		case 'message_start':
			return null;

		// Streaming deltas → chunks
		case 'message_update':
			return fromAssistantMessageEvent(event.assistantMessageEvent, messageId);

		// Complete message → update
		case 'message_end': {
			const piMsg = event.message as PiMessage;
			if (piMsg.role === 'assistant') {
				return {
					type: 'update',
					message: fromPiMessage(piMsg),
				};
			}
			return null;
		}

		// Agent Lifecycle ignored.
		case 'agent_start':
		case 'agent_end':
			return null;

		// Tool execution — routed through reverse RPC (BaseClient), not streamed
		case 'tool_execution_start':
		case 'tool_execution_update':
		case 'tool_execution_end':
			return null;
	}
}

// ---------------------------------------------------------------------------
// AssistantMessageEvent → StreamEvent (chunk extraction)
// ---------------------------------------------------------------------------

// TODO: We should try to understand exactly when these are all emitted. It's not super clear.
function fromAssistantMessageEvent(
	event: AssistantMessageEvent,
	messageId: string,
): StreamEvent | null {
	switch (event.type) {
		case 'text_delta':
			return {
				type: 'chunk',
				messageId,
				role: 'assistant',
				content: { type: 'text', text: event.delta },
			};
		case 'thinking_delta':
			return {
				type: 'chunk',
				messageId,
				role: 'assistant',
				content: { type: 'thinking', text: event.delta },
			};
		// TODO: how does this interact with toolcall_delta? Should we defer to that instead?
		case 'toolcall_end':
			return {
				type: 'update',
				message: {
					role: 'assistant',
					content: [
						{
							type: 'toolCall',
							id: event.toolCall.id,
							name: event.toolCall.name,
							arguments: event.toolCall.arguments,
						},
					],
				},
			};
		// Events we don't translate — lifecycle/structure handled elsewhere
		// Called at start of message (but before first chunk)
		case 'start':
		case 'text_start':
		case 'toolcall_start':
		case 'thinking_start':
			// Called during streaming of message
			return null;
		case 'toolcall_delta':
		case 'text_end':
		case 'thinking_end':
			// Called at end of message (but after last chunk)
			return null;
		case 'done':
		case 'error':
			return null;
	}
}
