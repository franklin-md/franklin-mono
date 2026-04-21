import type { LLMConfig, Message, Usage } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';

export type CoreState = {
	core: {
		messages: Message[];
		llmConfig: Omit<LLMConfig, 'apiKey'>;
		usage: Usage;
	};
};

export function emptyCoreState(): CoreState {
	return {
		core: { messages: [], llmConfig: {}, usage: ZERO_USAGE },
	};
}
