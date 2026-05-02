import { buildWaterfall, passThrough } from '@franklin/lib/middleware';
import type { BaseRuntime } from '../../../../../algebra/runtime/types.js';
import { bindHandlers, bindTool } from '../../registrar/bind.js';
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
	const cancel = bindHandlers(registrations.cancel, getCtx);
	const prompt = bindHandlers(registrations.prompt, getCtx);
	const streamObs: StreamObservers = {
		turnStart: bindHandlers(registrations.turnStart, getCtx),
		chunk: bindHandlers(registrations.chunk, getCtx),
		update: bindHandlers(registrations.update, getCtx),
		turnEnd: bindHandlers(registrations.turnEnd, getCtx),
	};
	const toolObs: ToolObservers = {
		toolCall: bindHandlers(registrations.toolCall, getCtx),
		toolResult: bindHandlers(registrations.toolResult, getCtx),
	};
	const tools = registrations.tools.map((t) => bindTool(t, getCtx));

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
			tools.length > 0 || hasAnyToolObserver(toolObs)
				? buildToolExecuteMiddleware(tools, toolObs)
				: passThrough(),
	};

	return { client, server };
}
