import { createSimpleContext } from '../create-simple-context.js';

export interface PromptContextValue {
	readonly input: string;
	readonly setInput: (value: string) => void;
	readonly sending: boolean;
	readonly canSend: boolean;
	readonly send: () => void;
}

export const [PromptProvider, usePrompt] =
	createSimpleContext<PromptContextValue>('Prompt');
