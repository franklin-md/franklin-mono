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

// ---------------------------------------------------------------------------
// Ctx patch — the shape accepted at the `setContext` boundary
//
// Top-level fields are optional (omitted fields are left unchanged). Present
// fields merge into the current Ctx per-type:
// - history merges by property (systemPrompt/messages each replace when set)
// - tools replaces the list wholesale
// - config merges by property
// ---------------------------------------------------------------------------

export type HistoryPatch = Partial<History>;

export type LLMConfigPatch = Partial<LLMConfig>;

export type CtxPatch = {
	history?: HistoryPatch;
	tools?: ToolDefinition[];
	config?: LLMConfigPatch;
};
