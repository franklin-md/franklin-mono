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

/** Ordered list of all thinking levels, from off to maximum. */
export const THINKING_LEVELS: readonly ThinkingLevel[] = [
	'off',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
] as const;

export type LLMConfig = {
	model?: string;
	provider?: string;
	reasoning?: ThinkingLevel;
	/** API key for the LLM provider. Resolved by the auth layer and injected here. */
	apiKey?: string;
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
