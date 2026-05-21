import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import { buildWaterfall, passThrough } from '@franklin/lib/middleware';
import type { CoreSignature } from '../../../api/api.js';
import { bindRegisteredEventHandlers } from '../../registrations/index.js';
import { buildPromptWaterfall } from './builders/index.js';
import type { FullMiddleware } from './types.js';

export function buildMiddleware<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): FullMiddleware {
	const cancel = bindRegisteredEventHandlers(registrations, 'cancel', getCtx);
	const prompt = bindRegisteredEventHandlers(registrations, 'prompt', getCtx);

	const client: FullMiddleware['client'] = {
		initialize: passThrough(),
		setContext: passThrough(),
		prompt: passThrough(),
		cancel: passThrough(),
	};

	if (cancel.length > 0) {
		client.cancel = buildWaterfall(cancel);
	}

	if (prompt.length > 0) {
		client.prompt = buildPromptWaterfall(prompt);
	}

	const server: FullMiddleware['server'] = {
		toolExecute: passThrough(),
	};

	return { client, server };
}
