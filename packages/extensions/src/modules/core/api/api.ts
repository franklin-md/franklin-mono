import type { ExtensionToolDefinition, ToolExecuteReturn } from './tool.js';
import type { ToolSpec } from './tool-spec.js';
import type {
	CancelHandler,
	PromptHandler,
	StreamObserverHandler,
	SystemPromptHandler,
	ToolObserverHandler,
} from './handlers.js';
import type { MaybePromise } from '../../../algebra/types/shared.js';
import type { WithContext } from '../compile/registrar/types.js';
import type { API } from '../../../algebra/api/index.js';
import type { BaseRuntime } from '../../../algebra/runtime/index.js';

/**
 * The bound Core registration surface at runtime `R`. This is what
 * extensions hold and call methods on once `CoreAPI` has been applied
 * to a concrete runtime.
 *
 * Lifted into the HKT space below as `CoreAPI`. Most consumers do not
 * reference `CoreAPISurface` directly — they spell the bound shape as
 * `BoundAPI<CoreAPI, MyRuntime>`.
 */
export interface CoreAPISurface<R extends BaseRuntime> {
	on(event: 'prompt', handler: WithContext<PromptHandler, R>): void;
	on(event: 'cancel', handler: WithContext<CancelHandler, R>): void;

	on(event: 'systemPrompt', handler: WithContext<SystemPromptHandler, R>): void;

	on(
		event: 'chunk',
		handler: WithContext<StreamObserverHandler<'chunk'>, R>,
	): void;
	on(
		event: 'update',
		handler: WithContext<StreamObserverHandler<'update'>, R>,
	): void;
	on(
		event: 'turnEnd',
		handler: WithContext<StreamObserverHandler<'turnEnd'>, R>,
	): void;

	on(
		event: 'toolCall',
		handler: WithContext<ToolObserverHandler<'toolCall'>, R>,
	): void;
	on(
		event: 'toolResult',
		handler: WithContext<ToolObserverHandler<'toolResult'>, R>,
	): void;

	registerTool<TInput>(tool: ExtensionToolDefinition<TInput, R>): void;

	registerTool<TArgs>(
		spec: ToolSpec<string, TArgs>,
		execute: (params: TArgs, runtime: R) => MaybePromise<ToolExecuteReturn>,
	): void;
}

/**
 * Core registration API as a type-level function `Runtime → APISurface`.
 *
 * Composition substitutes the eventual fully-tied runtime, so handlers
 * registered via `on(...)` receive the composed runtime as their
 * trailing argument and can read `runtime.environment`,
 * `runtime.orchestrator`, `runtime.getStore(key)`, etc.
 *
 * Extensions consume the bound surface as `BoundAPI<CoreAPI, R>` for
 * the runtime slice they need.
 */
export interface CoreAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: CoreAPISurface<this['In']>;
}
