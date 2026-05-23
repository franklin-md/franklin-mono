import { buildSystemPromptAssembler } from '../compile/decorators/prompt/system-prompt/assembler/index.js';
import type { CoreEventRegistrations } from '../compile/registrations/index.js';
import type { SystemPromptBuilder } from './types.js';

type CreateSystemPromptBuilderInput = {
	readonly registrations: CoreEventRegistrations;
};

export function createSystemPromptBuilder({
	registrations,
}: CreateSystemPromptBuilderInput): SystemPromptBuilder {
	const handlers = registrations.handlersFor('systemPrompt');
	if (handlers.length === 0) return emptySystemPromptBuilder;

	const assembler = buildSystemPromptAssembler(handlers);

	return {
		async build() {
			return assembler.assemble();
		},
	};
}

const emptySystemPromptBuilder: SystemPromptBuilder = {
	async build() {
		return undefined;
	},
};
