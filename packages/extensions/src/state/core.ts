import type { History, LLMConfig } from '@franklin/mini-acp';

export type CoreState = {
	core: {
		history: History;
		llmConfig: Omit<LLMConfig, 'apiKey'>;
	};
};

export function emptyCoreState(): CoreState {
	return {
		core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
	};
}
