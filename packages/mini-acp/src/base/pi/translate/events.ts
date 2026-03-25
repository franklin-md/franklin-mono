// ---------------------------------------------------------------------------
// AgentEvent → StreamEvent translation
// ---------------------------------------------------------------------------

import type {
	Message as PiMessage,
	AssistantMessage as PiAssistantMessage,
	AssistantMessageEvent,
} from '@mariozechner/pi-ai';
import type { AgentEvent } from '@mariozechner/pi-agent-core';

import { fromPiMessage } from './message.js';
import { fromPiStopReason } from './content.js';
import type { StreamEvent } from 'packages/mini-acp/src/types/stream.js';
// ---------------------------------------------------------------------------
// AgentEvent → StreamEvent
// ---------------------------------------------------------------------------

export function fromAgentEvent(
	event: AgentEvent,
	messageId: string,
): StreamEvent | null {
	switch (event.type) {
		case 'agent_start':
		case 'turn_start':
		case 'turn_end': // turn_end in Pi is just one trip round the agent loop.
		case 'message_start':
			return null;

		// The agent_end may emit the stopReason = error because of no APIKey for example
		case 'agent_end': {
			// agent_end in Pi represents the end of one full turn of the agent
			// The last message sent will be a `turn_end` message with reasons
			const turnEnd = event.messages.at(-1) as PiAssistantMessage;
			const stopReason = fromPiStopReason(turnEnd.stopReason);
			if (stopReason === null)
				throw new Error('stopReason should never be undefined');
			return {
				type: 'turnEnd',
				stopReason,
				stopMessage: turnEnd.errorMessage,
			};
		}
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
