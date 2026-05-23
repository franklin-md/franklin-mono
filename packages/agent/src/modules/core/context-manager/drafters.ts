import type { ToolDefinition } from '@franklin/mini-acp';
import type { SystemPromptBuilder } from './system-prompt/index.js';
import type { SessionDrafter } from './session-draft.js';

export interface ToolDefinitionDrafter {
	definitions(): readonly ToolDefinition[];
	revision(): number;
}

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
	tools: ToolDefinitionDrafter,
): SessionDrafter {
	return (context) => {
		context.setTools(tools.definitions(), `tools:${tools.revision()}`);
	};
}
