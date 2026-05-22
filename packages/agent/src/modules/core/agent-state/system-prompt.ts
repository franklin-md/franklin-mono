import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../api/api.js';
import { buildSystemPromptAssembler } from '../compile/decorators/prompt/system-prompt/assembler/index.js';
import { bindRegisteredEventHandlers } from '../compile/registrations/index.js';
import type { SystemPromptBuilder } from './types.js';

type CreateSystemPromptBuilderInput<Runtime extends BaseRuntime> = {
	readonly registrations: RegistryView<CoreSignature, Runtime>;
	readonly getRuntime: () => Runtime;
};

export function createSystemPromptBuilder<Runtime extends BaseRuntime>({
	registrations,
	getRuntime,
}: CreateSystemPromptBuilderInput<Runtime>): SystemPromptBuilder {
	const handlers = bindRegisteredEventHandlers(
		registrations,
		'systemPrompt',
		getRuntime,
	);
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
