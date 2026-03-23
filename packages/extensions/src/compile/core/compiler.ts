import type { CoreAPI } from '../../api/core/api.js';
import type { CoreEvent, CoreEventHandler } from '../../api/core/events.js';
import type { ExtensionToolDefinition } from '../../api/core/tool.js';
import type {
	ClientMiddleware,
	FullMiddleware,
} from '../../api/core/middleware/types.js';
import type { Compiler } from '../types.js';
import {
	buildAsyncWaterfall,
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	buildToolInjector,
} from './builders/index.js';

/**
 * Create a fresh core compiler instance.
 *
 * The core compiler handles:
 * - Event handlers (on/prompt/setContext/initialize/cancel) → ClientMiddleware
 * - Tool registration → ServerMiddleware + tool injection into setContext
 */
export function createCoreCompiler(): Compiler<CoreAPI, FullMiddleware> {
	const handlers = new Map<CoreEvent, CoreEventHandler<CoreEvent>[]>();
	const tools: ExtensionToolDefinition[] = [];

	const api: CoreAPI = {
		on(event, handler) {
			let list = handlers.get(event);
			if (!list) {
				list = [];
				handlers.set(event, list);
			}
			list.push(handler as CoreEventHandler<CoreEvent>);
		},
		registerTool(tool) {
			tools.push(tool);
		},
	};

	return {
		api,
		async build() {
			// ----- ClientMiddleware (waterfall on outgoing requests) -----
			const client: Partial<ClientMiddleware> = {};

			for (const [key, fns] of handlers) {
				if (key === 'prompt') {
					client.prompt = buildPromptWaterfall(
						fns as CoreEventHandler<'prompt'>[],
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

			// Append tool definitions to context via setContext middleware
			if (tools.length > 0) {
				client.setContext = buildToolInjector(tools, client.setContext);
			}

			// ----- ServerMiddleware (short-circuit on tool execution) -----
			const server =
				tools.length > 0
					? { toolExecute: buildToolExecuteMiddleware(tools) }
					: undefined;

			// ----- Assemble FullMiddleware -----
			return {
				...(Object.keys(client).length > 0
					? { client: client as ClientMiddleware }
					: {}),
				...(server ? { server } : {}),
			} as FullMiddleware;
		},
	};
}
