import type { LLMConfig, Message, Usage } from '@franklin/mini-acp';

export type SummaryInput = {
	readonly messages: Message[];
	readonly config: LLMConfig;
	readonly contextWindow: number;
	readonly signal: AbortSignal;
};

export type SummaryResult = {
	readonly summary: string;
	readonly usage: Usage;
};

export type Summarize = (input: SummaryInput) => Promise<SummaryResult>;
