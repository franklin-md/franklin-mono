import type { CancelHandler } from '../api/handlers.js';
import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import type { FullMiddleware } from '../api/middleware/types.js';
import { passThrough, buildWaterfall } from '@franklin/lib/middleware';
import {
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	buildToolInjector,
	hasAnyToolObserver,
	type StreamObservers,
	type ToolObservers,
} from './builders/index.js';
import type { CoreRegistrar, WithContext } from './registrar/types.js';

function streamObservers<R extends BaseRuntime<unknown>>(
	r: CoreRegistrar<R>,
): StreamObservers<R> {
	return {
		turnStart: r.turnStart,
		chunk: r.chunk,
		update: r.update,
		turnEnd: r.turnEnd,
	};
}

function toolObservers<R extends BaseRuntime<unknown>>(
	r: CoreRegistrar<R>,
): ToolObservers<R> {
	return { toolCall: r.toolCall, toolResult: r.toolResult };
}

function bindCancel<R>(
	raws: WithContext<CancelHandler, R>[],
	getCtx: () => R,
): CancelHandler[] {
	return raws.map(
		(h) =>
			((params: Parameters<CancelHandler>[0]) =>
				h(params, getCtx())) as CancelHandler,
	);
}

export function buildMiddleware<Runtime extends BaseRuntime<unknown>>(
	registered: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): FullMiddleware {
	const tObservers = toolObservers(registered);

	const client: FullMiddleware['client'] = {
		initialize: passThrough(),
		setContext: passThrough(),
		prompt: passThrough(),
		cancel: passThrough(),
	};

	if (registered.cancel.length > 0) {
		client.cancel = buildWaterfall(bindCancel(registered.cancel, getCtx));
	}

	if (
		registered.prompt.length > 0 ||
		registered.turnStart.length > 0 ||
		registered.chunk.length > 0 ||
		registered.update.length > 0 ||
		registered.turnEnd.length > 0
	) {
		client.prompt = buildPromptWaterfall(
			registered.prompt,
			streamObservers(registered),
			getCtx,
		);
	}

	if (registered.tools.length > 0) {
		client.setContext = buildToolInjector(registered.tools, client.setContext);
	}

	const server: FullMiddleware['server'] = {
		toolExecute:
			registered.tools.length > 0 || hasAnyToolObserver(tObservers)
				? buildToolExecuteMiddleware(registered.tools, tObservers, getCtx)
				: passThrough(),
	};

	return { client, server };
}
