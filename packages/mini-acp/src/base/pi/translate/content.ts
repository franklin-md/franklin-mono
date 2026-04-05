// ---------------------------------------------------------------------------
// Content translation between pi-ai and mini-acp
// ---------------------------------------------------------------------------

import type {
	TextContent as PiTextContent,
	ThinkingContent as PiThinkingContent,
	ImageContent as PiImageContent,
	ToolCall as PiToolCall,
} from '@mariozechner/pi-ai';

import type {
	UserContent,
	AssistantContent,
	ToolResultContent,
} from '../../../types/content.js';
// ---------------------------------------------------------------------------
// pi-ai → mini-acp (per-role, returning narrowed types)
// ---------------------------------------------------------------------------

export function fromPiUserContent(
	c: PiTextContent | PiImageContent,
): UserContent {
	switch (c.type) {
		case 'text':
			return { type: 'text', text: c.text };
		case 'image':
			return { type: 'image', data: c.data, mimeType: c.mimeType };
	}
}

export function fromPiAssistantContent(
	c: PiTextContent | PiThinkingContent | PiToolCall,
): AssistantContent {
	switch (c.type) {
		case 'text':
			return { type: 'text', text: c.text };
		case 'thinking':
			return { type: 'thinking', text: c.thinking };
		case 'toolCall':
			return {
				type: 'toolCall',
				id: c.id,
				name: c.name,
				arguments: c.arguments,
			};
	}
}

export function fromPiToolResultContent(
	c: PiTextContent | PiImageContent,
): ToolResultContent {
	switch (c.type) {
		case 'text':
			return { type: 'text', text: c.text };
		case 'image':
			return { type: 'image', data: c.data, mimeType: c.mimeType };
	}
}

// ---------------------------------------------------------------------------
// mini-acp → pi-ai (per-role, accepting narrowed types)
// ---------------------------------------------------------------------------

export function toPiUserContent(
	c: UserContent,
): PiTextContent | PiImageContent {
	switch (c.type) {
		case 'text':
			return { type: 'text', text: c.text };
		case 'image':
			return { type: 'image', data: c.data, mimeType: c.mimeType };
	}
}

export function toPiAssistantContent(
	c: AssistantContent,
): PiTextContent | PiThinkingContent | PiToolCall {
	switch (c.type) {
		case 'text':
			return { type: 'text', text: c.text };
		case 'thinking':
			return { type: 'thinking', thinking: c.text };
		case 'image':
			// pi-ai AssistantMessage content doesn't include images; degrade to text
			return { type: 'text', text: '[image]' };
		case 'toolCall':
			return {
				type: 'toolCall',
				id: c.id,
				name: c.name,
				arguments: c.arguments,
			};
	}
}

export function toPiToolResultContent(
	c: ToolResultContent,
): PiTextContent | PiImageContent {
	switch (c.type) {
		case 'text':
			return { type: 'text', text: c.text };
		case 'image':
			return { type: 'image', data: c.data, mimeType: c.mimeType };
	}
}
