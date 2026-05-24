import type { ToolRegistry } from '../tools/index.js';
import type { SystemPromptBuilder } from './system-prompt/index.js';
import type { SessionDrafter } from './session-draft.js';

export function createSystemPromptDrafter(
	builder: SystemPromptBuilder,
): SessionDrafter {
	let lastPrompt: string | undefined;
	let revision = 0;

	return async (context) => {
		const systemPrompt = await builder.build();
		if (systemPrompt === undefined) return;
		if (systemPrompt !== lastPrompt) {
			lastPrompt = systemPrompt;
			revision += 1;
		}
		context.setSystemPrompt(systemPrompt, `system-prompt:${revision}`);
	};
}

export function createToolDefinitionDrafter(
	tools: ToolRegistry,
): SessionDrafter {
	return (context) => {
		context.setTools(tools.definitions(), `tools:${tools.revision()}`);
	};
}
