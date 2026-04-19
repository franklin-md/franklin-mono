import type { ExtensionToolDefinition, ToolExecuteReturn } from './tool.js';
import type { ToolSpec } from './tool-spec.js';
import type {
	CancelHandler,
	PromptHandler,
	StreamObserverHandler,
	SystemPromptHandler,
	ToolObserverHandler,
} from './handlers.js';
import type { MaybePromise } from '../../../algebra/types/index.js';
import type { WithContext } from '../compile/registrar/types.js';
import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import type { CoreRuntime } from '../runtime.js';

/**
 * Core registration surface, parameterised by the eventual Runtime
 * handlers receive as their trailing argument.
 *
 * `CoreAPI<Runtime>` is covariant in Runtime: an extension requiring
 * `CoreAPI<MyRuntime>` accepts a `CoreAPI<FullRuntime>` whenever
 * `FullRuntime <: MyRuntime`. Each extension declares the runtime slice
 * it needs; the assembler picks the concrete Runtime.
 *
 * Handlers receive the fully-tied Runtime *directly* as their trailing
 * argument — no wrapper object. Extensions read capabilities via
 * `runtime.environment`, `runtime.session`, `runtime.getStore(key)`, etc.
 */
export interface CoreAPI<Runtime extends BaseRuntime<unknown> = CoreRuntime> {
	on(event: 'prompt', handler: WithContext<PromptHandler, Runtime>): void;
	on(event: 'cancel', handler: WithContext<CancelHandler, Runtime>): void;

	on(
		event: 'systemPrompt',
		handler: WithContext<SystemPromptHandler, Runtime>,
	): void;

	on(
		event: 'chunk',
		handler: WithContext<StreamObserverHandler<'chunk'>, Runtime>,
	): void;
	on(
		event: 'update',
		handler: WithContext<StreamObserverHandler<'update'>, Runtime>,
	): void;
	on(
		event: 'turnEnd',
		handler: WithContext<StreamObserverHandler<'turnEnd'>, Runtime>,
	): void;

	on(
		event: 'toolCall',
		handler: WithContext<ToolObserverHandler<'toolCall'>, Runtime>,
	): void;
	on(
		event: 'toolResult',
		handler: WithContext<ToolObserverHandler<'toolResult'>, Runtime>,
	): void;

	registerTool<TInput>(tool: ExtensionToolDefinition<TInput, Runtime>): void;

	registerTool<TArgs>(
		spec: ToolSpec<string, TArgs>,
		execute: (
			params: TArgs,
			runtime: Runtime,
		) => MaybePromise<ToolExecuteReturn>,
	): void;
}
