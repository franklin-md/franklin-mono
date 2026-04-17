import type {
	CancelHandler,
	PromptHandler,
	StreamObserverEvent,
	StreamObserverHandler,
	ToolObserverEvent,
	ToolObserverHandler,
} from '../api/events.js';
import type { ExtensionToolDefinition } from '../api/tool.js';
import type { FullMiddleware } from '../api/middleware/types.js';
import { passThrough, buildWaterfall } from '@franklin/lib/middleware';
import {
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
	cancelHandlers: CancelHandler[],
	promptHandlers: PromptHandler[],
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

	if (cancelHandlers.length > 0) {
		client.cancel = buildWaterfall(cancelHandlers);
	}

	if (promptHandlers.length > 0 || observers.size > 0) {
		client.prompt = buildPromptWaterfall(promptHandlers, observers);
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
