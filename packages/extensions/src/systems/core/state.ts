import type { LLMConfig, Message } from '@franklin/mini-acp';

export type CoreState = {
	core: {
		messages: Message[];
		llmConfig: Omit<LLMConfig, 'apiKey'>;
	};
};

export function emptyCoreState(): CoreState {
	return {
		core: { messages: [], llmConfig: {} },
	};
}
