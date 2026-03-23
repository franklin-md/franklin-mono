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
		// Lifecycle — we emit turnStart/turnEnd ourselves
		case 'agent_start':
		case 'agent_end':
		case 'turn_start':
		case 'turn_end':
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
		case 'toolcall_end':
			return {
				type: 'chunk',
				messageId,
				role: 'assistant',
				content: {
					type: 'toolCall',
					id: event.toolCall.id,
					name: event.toolCall.name,
					arguments: event.toolCall.arguments,
				},
			};
		// Events we don't translate — lifecycle/structure handled elsewhere
		case 'start':
		case 'text_start':
		case 'text_end':
		case 'thinking_start':
		case 'thinking_end':
		case 'toolcall_start':
		case 'toolcall_delta':
		case 'done':
		case 'error':
			return null;
	}
}
