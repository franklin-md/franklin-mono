import type { Context } from '@franklin/mini-acp';

export function copyContext(context: Context): Context {
	return {
		systemPrompt: context.systemPrompt,
		messages: [...context.messages],
		tools: [...context.tools],
		config: { ...context.config },
	};
}
