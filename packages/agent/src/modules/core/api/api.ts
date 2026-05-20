import type { ExtensionToolDefinition, ToolExecuteReturn } from './tool.js';
import type { ToolSpec } from './tool-spec.js';
import type {
	CancelHandler,
	PromptHandler,
	StreamObserverHandler,
	SystemPromptHandler,
	ToolObserverHandler,
} from './handlers.js';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { Signature, WithRuntime } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';

export type CoreEventHandlers<R extends BaseRuntime> = {
	prompt: WithRuntime<PromptHandler, R>;
	cancel: WithRuntime<CancelHandler, R>;
	systemPrompt: WithRuntime<SystemPromptHandler, R>;
	turnStart: WithRuntime<StreamObserverHandler<'turnStart'>, R>;
	chunk: WithRuntime<StreamObserverHandler<'chunk'>, R>;
	update: WithRuntime<StreamObserverHandler<'update'>, R>;
	turnEnd: WithRuntime<StreamObserverHandler<'turnEnd'>, R>;
	toolCall: WithRuntime<ToolObserverHandler<'toolCall'>, R>;
	toolResult: WithRuntime<ToolObserverHandler<'toolResult'>, R>;
};

export type CoreOnRegistration<R extends BaseRuntime> = {
	[K in keyof CoreEventHandlers<R>]: [
		event: K,
		handler: CoreEventHandlers<R>[K],
	];
}[keyof CoreEventHandlers<R>];

export type CoreRegisterToolRegistration<
	R extends BaseRuntime,
	TArgs = unknown,
> =
	| [tool: ExtensionToolDefinition<TArgs, R>]
	| [
			spec: ToolSpec<string, TArgs>,
			execute: (params: TArgs, runtime: R) => MaybePromise<ToolExecuteReturn>,
	  ];

/**
 * The concrete Core registration surface at runtime `R`. This is what
 * extensions hold and call methods on after `CoreSignature` has been applied
 * to a concrete runtime.
 */
export interface CoreAPI<R extends BaseRuntime> {
	on(event: 'prompt', handler: CoreEventHandlers<R>['prompt']): void;
	on(event: 'cancel', handler: CoreEventHandlers<R>['cancel']): void;
	on(
		event: 'systemPrompt',
		handler: CoreEventHandlers<R>['systemPrompt'],
	): void;
	on(event: 'turnStart', handler: CoreEventHandlers<R>['turnStart']): void;
	on(event: 'chunk', handler: CoreEventHandlers<R>['chunk']): void;
	on(event: 'update', handler: CoreEventHandlers<R>['update']): void;
	on(event: 'turnEnd', handler: CoreEventHandlers<R>['turnEnd']): void;
	on(event: 'toolCall', handler: CoreEventHandlers<R>['toolCall']): void;
	on(event: 'toolResult', handler: CoreEventHandlers<R>['toolResult']): void;

	registerTool<TInput>(tool: ExtensionToolDefinition<TInput, R>): void;
	registerTool<TArgs>(...args: CoreRegisterToolRegistration<R, TArgs>): void;
}

/**
 * Core registration signature as a type-level function `Runtime -> CoreAPI`.
 *
 * Composition substitutes the eventual fully-tied runtime, so handlers
 * registered via `on(...)` receive the composed runtime as their
 * trailing argument and can read `runtime.environment`,
 * `runtime.orchestrator`, `runtime.getStore(key)`, etc.
 *
 * Extensions consume the concrete surface as `API<CoreSignature, R>` for the
 * runtime slice they need.
 */
export interface CoreSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: CoreAPI<this['In']>;
}
