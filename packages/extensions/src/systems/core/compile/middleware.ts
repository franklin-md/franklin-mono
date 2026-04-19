import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import type { FullMiddleware } from '../api/middleware/types.js';
import { passThrough, buildWaterfall } from '@franklin/lib/middleware';
import {
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	buildToolInjector,
	hasAnyStreamObserver,
	hasAnyToolObserver,
	type StreamObservers,
	type ToolObservers,
} from './builders/index.js';
import { bindHandlers, bindTool } from './registrar/bind.js';
import type { CoreRegistrar } from './registrar/types.js';

export function buildMiddleware<Runtime extends BaseRuntime<unknown>>(
	registered: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): FullMiddleware {
	const cancel = bindHandlers(registered.cancel, getCtx);
	const prompt = bindHandlers(registered.prompt, getCtx);
	const streamObs: StreamObservers = {
		turnStart: bindHandlers(registered.turnStart, getCtx),
		chunk: bindHandlers(registered.chunk, getCtx),
		update: bindHandlers(registered.update, getCtx),
		turnEnd: bindHandlers(registered.turnEnd, getCtx),
	};
	const toolObs: ToolObservers = {
		toolCall: bindHandlers(registered.toolCall, getCtx),
		toolResult: bindHandlers(registered.toolResult, getCtx),
	};
	const tools = registered.tools.map((t) => bindTool(t, getCtx));

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

	if (tools.length > 0) {
		client.setContext = buildToolInjector(tools, client.setContext);
	}

	const server: FullMiddleware['server'] = {
		toolExecute:
			tools.length > 0 || hasAnyToolObserver(toolObs)
				? buildToolExecuteMiddleware(tools, toolObs)
				: passThrough(),
	};

	return { client, server };
}
