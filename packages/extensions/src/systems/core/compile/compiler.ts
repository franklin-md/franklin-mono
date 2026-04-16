import type { ClientProtocol } from '@franklin/mini-acp';
import type { CoreAPI } from '../api/api.js';
import type {
	CoreEventHandler,
	PromptHandler,
	StreamObserverEvent,
	StreamObserverHandler,
	ToolObserverEvent,
	ToolObserverHandler,
} from '../api/events.js';
import type { ExtensionToolDefinition } from '../api/tool.js';
import type { ToolSpec } from '../api/tool-spec.js';
import type { FullMiddleware } from '../api/middleware/types.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import {
	STREAM_OBSERVER_EVENTS,
	TOOL_OBSERVER_EVENTS,
	addEventHandler,
	buildMiddleware,
} from './middleware.js';
import { buildCoreRuntime } from './build.js';
import type { CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';

export type SpawnResult = ClientProtocol & { dispose(): Promise<void> };

/**
 * Create a fresh core compiler instance.
 *
 * The core compiler handles:
 * - Request handlers (prompt/cancel) → ClientMiddleware
 * - Stream observers (on/chunk/update/turnEnd) → dispatched from prompt stream
 * - Tool registration → ServerMiddleware + tool injection into setContext
 *
 * When transport and state are provided, build() connects to the agent
 * process and returns a CoreRuntime. Without them, build() returns raw
 * FullMiddleware (useful for unit-testing middleware in isolation).
 */
export function createCoreCompiler(
	transport: SpawnResult,
	state: CoreState,
): Compiler<CoreAPI, CoreRuntime>;
export function createCoreCompiler(): Compiler<CoreAPI, FullMiddleware>;
export function createCoreCompiler(
	transport?: SpawnResult,
	state?: CoreState,
): Compiler<CoreAPI, CoreRuntime | FullMiddleware> {
	const cancelHandlers: CoreEventHandler<'cancel'>[] = [];
	const promptHandlers: PromptHandler[] = [];
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
			} else if (event === 'prompt') {
				promptHandlers.push(handler as PromptHandler);
			} else {
				cancelHandlers.push(handler as CoreEventHandler<'cancel'>);
			}
		},
		registerTool(
			specOrTool: ToolSpec | ExtensionToolDefinition,
			execute?: (params: any) => any,
		) {
			// TODO: Should we prohibit double registration?
			if (execute) {
				const spec = specOrTool as ToolSpec;
				tools.push({
					name: spec.name,
					description: spec.description,
					schema: spec.schema,
					execute,
				});
			} else {
				tools.push(specOrTool as ExtensionToolDefinition);
			}
		},
	};

	return {
		api,
		async build() {
			const middleware = buildMiddleware(
				cancelHandlers,
				promptHandlers,
				observers,
				toolObservers,
				tools,
			);

			if (!transport || !state) {
				return middleware;
			}

			return buildCoreRuntime(transport, state, middleware);
		},
	};
}
