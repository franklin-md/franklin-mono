import type { CoreRegistry } from '../../compile/registrations/index.js';
import { buildSystemPromptAssembler } from './assembler/index.js';

type CreateSystemPromptBuilderInput = {
	readonly registrations: CoreRegistry;
};

export interface SystemPromptBuilder {
	build(): Promise<string | undefined>;
}

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
