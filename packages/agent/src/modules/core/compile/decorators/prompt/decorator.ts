import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPClient } from '@franklin/mini-acp';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import type { CoreSignature } from '../../../api/api.js';
import type { PromptHandler } from '../../../api/handlers.js';
import { createPrompt } from '../../../api/prompt.js';
import { bindRegisteredEventHandlers } from '../../registrations/index.js';
import type { ProtocolDecorator } from '../types.js';

export function createPromptDecorator<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator | undefined {
	const handlers = bindRegisteredEventHandlers(registrations, 'prompt', getCtx);
	if (handlers.length === 0) return undefined;
	const promptMiddleware = buildPromptMiddleware(handlers);

	return {
		name: 'prompt',
		async server(s) {
			return s;
		},
		async client(c) {
			return {
				...c,
				prompt(message) {
					return promptMiddleware(message, (nextMessage) =>
						c.prompt(nextMessage),
					);
				},
			} as MiniACPClient;
		},
	};
}

export function buildPromptMiddleware(
	handlers: PromptHandler[],
): MethodMiddleware<MiniACPClient['prompt']> {
	return async function* (params, next) {
		const prompt = createPrompt(params);
		for (const handler of handlers) {
			await handler(prompt);
		}

		yield* next(prompt.asPrompt());
	};
}
