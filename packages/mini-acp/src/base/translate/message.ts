// ---------------------------------------------------------------------------
// Message translation between pi-ai and mini-acp
// ---------------------------------------------------------------------------

import type {
	UserMessage as PiUserMessage,
	AssistantMessage as PiAssistantMessage,
	ToolResultMessage as PiToolResultMessage,
	Message as PiMessage,
} from '@mariozechner/pi-ai';

import type {
	Message,
	UserMessage,
	AssistantMessage,
	ToolResultMessage,
} from '../../types/message.js';
import {
	fromPiUserContent,
	fromPiAssistantContent,
	fromPiToolResultContent,
	toPiUserContent,
	toPiAssistantContent,
	toPiToolResultContent,
} from './content.js';

// ---------------------------------------------------------------------------
// pi-ai → mini-acp
// ---------------------------------------------------------------------------

export function fromPiMessage(msg: PiMessage): Message {
	switch (msg.role) {
		case 'user': {
			const content =
				typeof msg.content === 'string'
					? [{ type: 'text' as const, text: msg.content }]
					: msg.content.map(fromPiUserContent);
			return { role: 'user', content };
		}
		case 'assistant':
			return {
				role: 'assistant',
				content: msg.content.map(fromPiAssistantContent),
			};
		case 'toolResult':
			return {
				role: 'toolResult',
				toolCallId: msg.toolCallId,
				content: msg.content.map(fromPiToolResultContent),
			};
	}
}

// ---------------------------------------------------------------------------
// mini-acp → pi-ai
// ---------------------------------------------------------------------------

const ZERO_USAGE = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} as const;

export function toPiUserMessage(msg: UserMessage): PiUserMessage {
	return {
		role: 'user',
		content: msg.content.map(toPiUserContent),
		timestamp: Date.now(),
	};
}

function toPiAssistantMessage(msg: AssistantMessage): PiAssistantMessage {
	return {
		role: 'assistant',
		content: msg.content.map(toPiAssistantContent),
		// Placeholder metadata — actual values come from LLM responses
		api: 'anthropic-messages',
		provider: 'anthropic',
		model: '',
		usage: ZERO_USAGE,
		stopReason: 'stop',
		timestamp: Date.now(),
	};
}

function toPiToolResultMessage(msg: ToolResultMessage): PiToolResultMessage {
	return {
		role: 'toolResult',
		toolCallId: msg.toolCallId,
		toolName: '',
		content: msg.content.map(toPiToolResultContent),
		isError: false,
		timestamp: Date.now(),
	};
}

export function toPiMessage(msg: Message): PiMessage {
	switch (msg.role) {
		case 'user':
			return toPiUserMessage(msg);
		case 'assistant':
			return toPiAssistantMessage(msg);
		case 'toolResult':
			return toPiToolResultMessage(msg);
	}
}
