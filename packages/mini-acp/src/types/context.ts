import type { Message } from './message.js';
import type { ToolDefinition } from './tool.js';

// ---------------------------------------------------------------------------
// Context — the full state needed to drive an agent turn
// ---------------------------------------------------------------------------

export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high';

export type LLMConfig = {
	model?: string;
	provider?: string;
	reasoning?: ThinkingLevel;
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
