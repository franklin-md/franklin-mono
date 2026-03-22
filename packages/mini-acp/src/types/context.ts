import type { Message } from './message.js';
import type { ToolDefinition } from './tool.js';

// ---------------------------------------------------------------------------
// Context — the full state needed to drive an agent turn
// ---------------------------------------------------------------------------

export type ThinkingLevel =
	| 'off'
	| 'minimal'
	| 'low'
	| 'medium'
	| 'high'
	| 'xhigh';

export type LLMConfig = {
	model?: string;
	provider?: string;
	reasoning?: ThinkingLevel;
	// TODO: I wonder if Authentication Token should be here? Then the LLM should really be fully powered.
};

export type History = {
	systemPrompt: string;
	messages: Message[];
};

export type Ctx = {
	history: History;
	tools: ToolDefinition[];
	config?: LLMConfig;
};
