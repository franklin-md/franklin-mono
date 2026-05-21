import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { UserMessage } from '@franklin/mini-acp';
import type { CoreSignature } from '../../../../api/api.js';
import type { PromptHandler } from '../../../../api/handlers.js';
import { createPrompt } from '../../../../api/prompt.js';
import { bindRegisteredEventHandlers } from '../../../registrations/index.js';

export function createPromptBuilder<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): (message: UserMessage) => Promise<UserMessage> {
	const handlers = bindRegisteredEventHandlers(
		registrations,
		'prompt',
		getRuntime,
	);

	return (message) => buildPrompt(message, handlers);
}

async function buildPrompt(
	message: UserMessage,
	handlers: readonly PromptHandler[],
): Promise<UserMessage> {
	if (handlers.length === 0) return message;

	const prompt = createPrompt(message);
	for (const handler of handlers) {
		await handler(prompt);
	}
	return prompt.asPrompt();
}
