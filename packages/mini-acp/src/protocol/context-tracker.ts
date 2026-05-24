import type { Context, ContextPatch } from '../types/context.js';
import type { Message } from '../types/message.js';
import type { ToolDefinition } from '../types/tool.js';

type MessageContent = Message['content'][number];

export interface ContextRecorder {
	apply(partial: ContextPatch): void;
	append(message: Message): void;
}

// ---------------------------------------------------------------------------
// Pure context mutation functions — work on both mutable Context and Immer Draft<Context>
// ---------------------------------------------------------------------------

/**
 * Apply a partial context update.
 *
 * `systemPrompt`, `messages`, and `tools` replace their current values when
 * present. `config` merges by property so omitted config fields are preserved.
 */
function applySetContext(context: Context, partial: ContextPatch): void {
	if (partial.systemPrompt !== undefined)
		context.systemPrompt = partial.systemPrompt;
	if (partial.messages !== undefined)
		context.messages = partial.messages.map(copyMessage);
	if (partial.tools !== undefined)
		context.tools = partial.tools.map(copyToolDefinition);
	if (partial.config !== undefined)
		context.config = { ...context.config, ...partial.config };
}

/**
 * Append a message to the context's model-visible messages.
 */
function appendMessage(context: Context, message: Message): void {
	context.messages.push(copyMessage(message));
}

function createEmptyContext(): Context {
	return {
		systemPrompt: '',
		messages: [],
		tools: [],
		config: {},
	};
}

// ---------------------------------------------------------------------------
// ContextTracker — mutable holder for agent-side context state
// ---------------------------------------------------------------------------

/**
 * Tracks the evolving Context on the agent side.
 *
 * Used by agent implementations and client-side context extensions to keep
 * context in sync with the actual conversation state (user messages from
 * prompt, response messages from update).
 */
export class ContextTracker implements ContextRecorder {
	private context: Context = createEmptyContext();

	onChange?: () => void;

	apply(partial: ContextPatch): void {
		applySetContext(this.context, partial);
		this.onChange?.();
	}

	append(message: Message): void {
		appendMessage(this.context, message);
		this.onChange?.();
	}

	reset(): void {
		this.context = createEmptyContext();
		this.onChange?.();
	}

	get(): Context {
		return copyContext(this.context);
	}
}

function copyContext(context: Context): Context {
	return {
		systemPrompt: context.systemPrompt,
		messages: context.messages.map(copyMessage),
		tools: context.tools.map(copyToolDefinition),
		config: { ...context.config },
	};
}

function copyMessage(message: Message): Message {
	switch (message.role) {
		case 'user':
			return {
				role: 'user',
				content: message.content.map(copyContent),
			};
		case 'assistant':
			return {
				role: 'assistant',
				content: message.content.map(copyContent),
			};
		case 'toolResult':
			return {
				role: 'toolResult',
				toolCallId: message.toolCallId,
				content: message.content.map(copyContent),
			};
	}
}

function copyContent<T extends MessageContent>(content: T): T {
	switch (content.type) {
		case 'text':
			return { type: 'text', text: content.text } as T;
		case 'thinking':
			return { type: 'thinking', text: content.text } as T;
		case 'image':
			return {
				type: 'image',
				data: content.data,
				mimeType: content.mimeType,
			} as T;
		case 'toolCall':
			return {
				type: 'toolCall',
				id: content.id,
				name: content.name,
				arguments: copyJson(content.arguments),
			} as T;
	}
}

function copyToolDefinition(tool: ToolDefinition): ToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: copyJson(tool.inputSchema),
	};
}

function copyJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
