import type { Context, ContextPatch, Message, Usage } from '@franklin/mini-acp';
import type { ContextTracker, UsageTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../state.js';

export interface RuntimeSystemPromptBuild {
	readonly systemPrompt: string;
	readonly changed: boolean;
}

export interface RuntimeSystemPromptBuilder {
	build(): Promise<RuntimeSystemPromptBuild>;
}

export interface RuntimeAgentState {
	getAgentContext(): Context;
	getSnapshot(): SessionSnapshot;
	readonly contextTracker: ContextTracker;
	readonly systemPrompt: RuntimeSystemPromptBuilder;
	readonly usageTracker: UsageTracker;
	apply(partial: ContextPatch): void;
	append(message: Message): void;
	add(delta: Usage): void;
}
