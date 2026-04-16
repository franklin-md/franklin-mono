import type {
	CoreEvent,
	CoreEventHandler,
	StreamObserverEvent,
	StreamObserverHandler,
	ToolObserverEvent,
	ToolObserverHandler,
} from '../api/events.js';
import type { ExtensionToolDefinition } from '../api/tool.js';
import type { FullMiddleware } from '../api/middleware/types.js';
import { passThrough } from '../api/middleware/pass-through.js';
import {
	buildAsyncWaterfall,
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	buildToolInjector,
} from './builders/index.js';

export const STREAM_OBSERVER_EVENTS = new Set<string>([
	'chunk',
	'update',
	'turnEnd',
]);
export const TOOL_OBSERVER_EVENTS = new Set<string>(['toolCall', 'toolResult']);

export function addEventHandler<K extends string, H>(
	map: Map<K, H[]>,
	key: K,
	handler: H,
): void {
	let list = map.get(key);
	if (!list) {
		list = [];
		map.set(key, list);
	}
	list.push(handler);
}

export function buildMiddleware(
	handlers: Map<CoreEvent, CoreEventHandler<CoreEvent>[]>,
	observers: Map<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>,
	toolObservers: Map<
		ToolObserverEvent,
		ToolObserverHandler<ToolObserverEvent>[]
	>,
	tools: ExtensionToolDefinition[],
): FullMiddleware {
	// ----- ClientMiddleware -----
	const client: FullMiddleware['client'] = {
		initialize: passThrough(),
		setContext: passThrough(),
		prompt: passThrough(),
		cancel: passThrough(),
	};

	for (const [key, fns] of handlers) {
		if (key === 'prompt') {
			client.prompt = buildPromptWaterfall(
				fns as CoreEventHandler<'prompt'>[],
				observers,
			);
		} else if (key === 'setContext') {
			client.setContext = buildAsyncWaterfall<'setContext'>(
				fns as CoreEventHandler<'setContext'>[],
			);
		} else if (key === 'initialize') {
			client.initialize = buildAsyncWaterfall<'initialize'>(
				fns as CoreEventHandler<'initialize'>[],
			);
		} else {
			client.cancel = buildAsyncWaterfall<'cancel'>(
				fns as CoreEventHandler<'cancel'>[],
			);
		}
	}

	if (observers.size > 0 && !handlers.has('prompt')) {
		client.prompt = buildPromptWaterfall([], observers);
	}

	if (tools.length > 0) {
		client.setContext = buildToolInjector(tools, client.setContext);
	}

	// ----- ServerMiddleware -----
	const server: FullMiddleware['server'] = {
		toolExecute:
			tools.length > 0 || toolObservers.size > 0
				? buildToolExecuteMiddleware(tools, toolObservers)
				: passThrough(),
	};

	return { client, server };
}
