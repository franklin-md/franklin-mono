import type { CoreAPI } from '../../api/core/api.js';
import type {
	CoreEvent,
	CoreEventHandler,
	StreamObserverEvent,
	StreamObserverHandler,
	ToolObserverEvent,
	ToolObserverHandler,
} from '../../api/core/events.js';
import type { ExtensionToolDefinition } from '../../api/core/tool.js';
import type { FullMiddleware } from '../../api/core/middleware/types.js';
import { passThrough } from '../../api/core/middleware/pass-through.js';
import type { Compiler } from '../types.js';
import {
	buildAsyncWaterfall,
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	buildToolInjector,
} from './builders/index.js';

const STREAM_OBSERVER_EVENTS = new Set<string>(['chunk', 'update', 'turnEnd']);
const TOOL_OBSERVER_EVENTS = new Set<string>(['toolCall', 'toolResult']);

function addEventHandler<K extends string, H>(
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

/**
 * Create a fresh core compiler instance.
 *
 * The core compiler handles:
 * - Event handlers (on/prompt/setContext/initialize/cancel) → ClientMiddleware
 * - Stream observers (on/chunk/update/turnEnd) → dispatched from prompt stream
 * - Tool registration → ServerMiddleware + tool injection into setContext
 */
export function createCoreCompiler(): Compiler<CoreAPI, FullMiddleware> {
	const handlers = new Map<CoreEvent, CoreEventHandler<CoreEvent>[]>();
	const observers = new Map<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>();
	const toolObservers = new Map<
		ToolObserverEvent,
		ToolObserverHandler<ToolObserverEvent>[]
	>();
	const tools: ExtensionToolDefinition[] = [];

	const api: CoreAPI = {
		on(event: string, handler: (...args: any[]) => any) {
			if (STREAM_OBSERVER_EVENTS.has(event)) {
				addEventHandler(
					observers,
					event as StreamObserverEvent,
					handler as StreamObserverHandler<StreamObserverEvent>,
				);
			} else if (TOOL_OBSERVER_EVENTS.has(event)) {
				addEventHandler(
					toolObservers,
					event as ToolObserverEvent,
					handler as ToolObserverHandler<ToolObserverEvent>,
				);
			} else {
				addEventHandler(
					handlers,
					event as CoreEvent,
					handler as CoreEventHandler<CoreEvent>,
				);
			}
		},
		registerTool(tool) {
			// TODO: Should we prohibit double registration?
			tools.push(tool);
		},
	};

	return {
		api,
		async build() {
			// ----- ClientMiddleware -----
			// Start with passThrough for every method, then overwrite with
			// registered handlers. This ensures client is always complete.
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

			// If observers exist but no prompt handler was registered,
			// still need to build a prompt waterfall to dispatch observers.
			if (observers.size > 0 && !handlers.has('prompt')) {
				client.prompt = buildPromptWaterfall([], observers);
			}

			// Append tool definitions to context via setContext middleware
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
		},
	};
}
