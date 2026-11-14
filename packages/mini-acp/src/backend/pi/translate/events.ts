// ---------------------------------------------------------------------------
// AgentEvent → content events. The adapter owns Mini-ACP lifecycle events.
// ---------------------------------------------------------------------------

import type {
	Message as PiMessage,
	AssistantMessageEvent,
} from '@earendil-works/pi-ai';
import type { AgentEvent } from '@earendil-works/pi-agent-core';

import { fromPiMessage } from './message.js';
import type { Chunk, Update } from '../../../types/stream.js';
// ---------------------------------------------------------------------------
// AgentEvent → StreamEvent
// ---------------------------------------------------------------------------

export function fromAgentEvent(
	event: AgentEvent,
	messageId: string,
): Chunk | Update | null {
	switch (event.type) {
		case 'agent_start':
		case 'turn_start':
		case 'turn_end': // turn_end in Pi is just one trip round the agent loop.
		case 'message_start':
			return null;

		// Pi emits agent_end before run settlement. Only the adapter can publish
		// the Mini-ACP terminal after the low-level run promise has resolved.
		case 'agent_end':
			return null;
		// Streaming deltas → chunks
		case 'message_update':
			return fromAssistantMessageEvent(event.assistantMessageEvent, messageId);

		// Complete message → update
		case 'message_end': {
			const piMsg = event.message as PiMessage;
			if (piMsg.role === 'assistant') {
				const message = fromPiMessage(piMsg);
				if (message.role !== 'assistant') return null;
				const content = message.content.filter(
					(block) => block.type !== 'toolCall',
				);
				if (content.length === 0) return null;
				return {
					type: 'update',
					messageId,
					message: {
						...message,
						content,
					},
				};
			}
			return null;
		}

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
): Chunk | null {
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
		case 'toolcall_end':
			return null;
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
