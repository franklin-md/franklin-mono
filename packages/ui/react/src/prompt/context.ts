import { createSimpleContext } from '../utils/create-simple-context.js';

export interface PromptContextValue {
	readonly input: string;
	readonly setInput: (value: string) => void;
	readonly sending: boolean;
	readonly canSend: boolean;
	readonly send: () => void;
	readonly cancel: () => void;
}

export const [PromptProvider, usePrompt] =
	createSimpleContext<PromptContextValue>('Prompt');
