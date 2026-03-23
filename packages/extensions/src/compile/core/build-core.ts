import type { CoreAPI } from '../../api/core/index.js';
import type { CoreEvent, CoreEventHandler } from '../../api/core/events.js';
import type { ExtensionToolDefinition } from '../../api/core/tool.js';
import type {
	ClientMiddleware,
	FullMiddleware,
} from '../../api/core/middleware/types.js';
import type { Extension } from '../../types/extension.js';
import type { Compiler, CompilerTransform } from './types.js';
import {
	buildAsyncWaterfall,
	buildPromptWaterfall,
	buildToolExecuteMiddleware,
	buildToolInjector,
} from './builders/index.js';

/**
 * Core compiler transform.
 *
 * Algorithm:
 * 1. Receive an Extension<TApi & CoreAPI>
 * 2. Create CoreAPI collectors (event handlers map + tools array)
 * 3. Wrap the extension as Extension<TApi> — when the inner compiler calls it
 *    with TApi, the wrapper merges in CoreAPI so the extension sees both
 * 4. Compile the wrapped extension via the inner compiler
 * 5. If the inner compiler didn't call the extension (base case at bottom of
 *    compiler stack), call it ourselves with just CoreAPI
 * 6. Build FullMiddleware from the collected handlers/tools
 * 7. Merge inner result with middleware
 */
export const buildCore = (<TApi, TResult>(
	compile: Compiler<TApi, TResult>,
): Compiler<TApi & CoreAPI, TResult & FullMiddleware> => {
	return async (extension: Extension<TApi & CoreAPI>) => {
		// ----- Collect registrations -------------------------------------------
		const handlers = new Map<CoreEvent, CoreEventHandler<CoreEvent>[]>();
		const tools: ExtensionToolDefinition[] = [];

		const coreApi: CoreAPI = {
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

		// ----- Wrap extension so inner compiler merges TApi + CoreAPI ----------
		let extensionCalled = false;
		const wrappedExtension: Extension<TApi> = (innerApi: TApi) => {
			extensionCalled = true;
			const mergedApi: TApi & CoreAPI = { ...innerApi, ...coreApi };
			extension(mergedApi);
		};

		// ----- Compile inner extension ----------------------------------------
		const inner = await compile(wrappedExtension);

		// If inner compiler didn't call the extension (base case at bottom of
		// the compiler stack), call it ourselves with CoreAPI only.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated in closure
		if (!extensionCalled) {
			extension(coreApi as TApi & CoreAPI);
		}

		// ----- Build ClientMiddleware (waterfall on outgoing requests) ---------
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

		// ----- Build ServerMiddleware (short-circuit on tool execution) --------
		const server =
			tools.length > 0
				? { toolExecute: buildToolExecuteMiddleware(tools) }
				: undefined;

		// ----- Merge with inner result ----------------------------------------
		return {
			...inner,
			...(Object.keys(client).length > 0
				? { client: client as ClientMiddleware }
				: {}),
			...(server ? { server } : {}),
		};
	};
}) as CompilerTransform<CoreAPI, FullMiddleware>;
