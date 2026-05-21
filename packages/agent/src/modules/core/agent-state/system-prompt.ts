import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../api/api.js';
import { buildSystemPromptAssembler } from '../compile/decorators/prompt/system-prompt/assembler/index.js';
import { bindRegisteredEventHandlers } from '../compile/registrations/index.js';
import type { RuntimeSystemPromptBuilder } from './types.js';

type CreateSystemPromptBuilderInput<Runtime extends BaseRuntime> = {
	readonly registrations: RegistryView<CoreSignature, Runtime>;
	readonly getRuntime: () => Runtime;
	readonly getLastSentSystemPrompt: () => string;
};

export function createSystemPromptBuilder<Runtime extends BaseRuntime>({
	registrations,
	getRuntime,
	getLastSentSystemPrompt,
}: CreateSystemPromptBuilderInput<Runtime>): RuntimeSystemPromptBuilder {
	const handlers = bindRegisteredEventHandlers(
		registrations,
		'systemPrompt',
		getRuntime,
	);
	if (handlers.length === 0) return emptySystemPromptBuilder;

	const assembler = buildSystemPromptAssembler(handlers);

	return {
		async build() {
			const systemPrompt = await assembler.assemble();
			return {
				systemPrompt,
				changed: systemPrompt !== getLastSentSystemPrompt(),
			};
		},
	};
}

const emptySystemPromptBuilder: RuntimeSystemPromptBuilder = {
	async build() {
		return {
			systemPrompt: '',
			changed: false,
		};
	},
};
