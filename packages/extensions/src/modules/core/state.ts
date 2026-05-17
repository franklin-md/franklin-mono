import type { LLMConfig, Message, Usage } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';

export type SessionSnapshot = {
	messages: Message[];
	llmConfig: Omit<LLMConfig, 'apiKey'>;
	usage: Usage;
};

export type CoreState = {
	core: SessionSnapshot;
};

export function emptySessionSnapshot(): SessionSnapshot {
	return {
		messages: [],
		llmConfig: {},
		usage: ZERO_USAGE,
	};
}

export function emptyCoreState(): CoreState {
	return { core: emptySessionSnapshot() };
}
