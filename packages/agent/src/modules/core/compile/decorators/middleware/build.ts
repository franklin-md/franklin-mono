import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import { buildWaterfall, passThrough } from '@franklin/lib/middleware';
import type { CoreSignature } from '../../../api/api.js';
import {
	bindRegisteredEventHandlers,
	registeredTools,
} from '../../registrations/index.js';
import {
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	hasAnyToolObserver,
	type ToolObservers,
} from './builders/index.js';
import type { FullMiddleware } from './types.js';

export function buildMiddleware<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): FullMiddleware {
	const cancel = bindRegisteredEventHandlers(registrations, 'cancel', getCtx);
	const prompt = bindRegisteredEventHandlers(registrations, 'prompt', getCtx);
	const toolObs: ToolObservers = {
		toolCall: bindRegisteredEventHandlers(registrations, 'toolCall', getCtx),
		toolResult: bindRegisteredEventHandlers(
			registrations,
			'toolResult',
			getCtx,
		),
	};
	const tools = registeredTools(registrations);

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
		toolExecute:
			tools.length > 0 || hasAnyToolObserver(toolObs)
				? buildToolExecuteMiddleware(tools, toolObs, getCtx)
				: passThrough(),
	};

	return { client, server };
}
