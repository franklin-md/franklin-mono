import type { ThinkingLevel } from '@franklin/mini-acp';

export type ModelSelection = {
	provider: string;
	model: string;
	reasoning: ThinkingLevel;
};
