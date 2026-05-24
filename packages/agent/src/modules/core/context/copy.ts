import type { Context, ContextPatch } from '@franklin/mini-acp';

export function copyContext(context: Context): Context {
	return {
		systemPrompt: context.systemPrompt,
		messages: [...context.messages],
		tools: [...context.tools],
		config: { ...context.config },
	};
}

export function copyContextPatch(patch: ContextPatch): ContextPatch {
	const copy: ContextPatch = {};
	if (patch.systemPrompt !== undefined) copy.systemPrompt = patch.systemPrompt;
	if (patch.messages !== undefined) copy.messages = [...patch.messages];
	if (patch.tools !== undefined) copy.tools = [...patch.tools];
	if (patch.config !== undefined) copy.config = { ...patch.config };
	return copy;
}
