import { buildWaterfall, passThrough } from '@franklin/lib/middleware';
import { bindAllWithRuntime, type BaseRuntime } from '@franklin/extensibility';
import type { CoreRegistrar } from '../../registrar/types.js';
import {
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	hasAnyStreamObserver,
	hasAnyToolObserver,
	type StreamObservers,
	type ToolObservers,
} from './builders/index.js';
import type { FullMiddleware } from './types.js';

export function buildMiddleware<Runtime extends BaseRuntime>(
	registrations: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): FullMiddleware {
	const cancel = bindAllWithRuntime(registrations.cancel, getCtx);
	const prompt = bindAllWithRuntime(registrations.prompt, getCtx);
	const streamObs: StreamObservers = {
		turnStart: bindAllWithRuntime(registrations.turnStart, getCtx),
		chunk: bindAllWithRuntime(registrations.chunk, getCtx),
		update: bindAllWithRuntime(registrations.update, getCtx),
		turnEnd: bindAllWithRuntime(registrations.turnEnd, getCtx),
	};
	const toolObs: ToolObservers = {
		toolCall: bindAllWithRuntime(registrations.toolCall, getCtx),
		toolResult: bindAllWithRuntime(registrations.toolResult, getCtx),
	};

	const client: FullMiddleware['client'] = {
		initialize: passThrough(),
		setContext: passThrough(),
		prompt: passThrough(),
		cancel: passThrough(),
	};

	if (cancel.length > 0) {
		client.cancel = buildWaterfall(cancel);
	}

	if (prompt.length > 0 || hasAnyStreamObserver(streamObs)) {
		client.prompt = buildPromptWaterfall(prompt, streamObs);
	}

	const server: FullMiddleware['server'] = {
		toolExecute:
			registrations.tools.length > 0 || hasAnyToolObserver(toolObs)
				? buildToolExecuteMiddleware(registrations.tools, toolObs, getCtx)
				: passThrough(),
	};

	return { client, server };
}
