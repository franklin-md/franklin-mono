import type {
	CancelHandler,
	PromptHandler,
	StreamObserverHandler,
	SystemPromptHandler,
	ToolObserverHandler,
} from '../../api/handlers.js';
import type { ExtensionToolDefinition } from '../../api/tool.js';
import type { BaseRuntime } from '../../../../algebra/runtime/types.js';

/**
 * Append a stage-1 context parameter to an existing handler signature.
 *
 * `WithContext<H, T>` is `H` with an extra trailing argument of type `T`.
 * TypeScript's function-arg width subtyping means a handler that ignores
 * the new argument (`(...origArgs) => ...`) is still assignable, so this
 * lets us add late-bound runtime context to api signatures without
 * touching the underlying handler types or breaking existing callers.
 */
export type WithContext<H extends (...args: any[]) => any, T> = (
	...args: [...Parameters<H>, T]
) => ReturnType<H>;

/**
 * Accumulated registrations from extensions — transport-free data, not
 * yet bound to runtime. One field per event: dispatch is direct property
 * lookup, no Map indirection. `composeDecorators(registered, getRuntime)`
 * binds these and produces the decorator stack.
 */
export type CoreRegistrar<Runtime extends BaseRuntime> = {
	prompt: WithContext<PromptHandler, Runtime>[];
	cancel: WithContext<CancelHandler, Runtime>[];
	systemPrompt: WithContext<SystemPromptHandler, Runtime>[];
	turnStart: WithContext<StreamObserverHandler<'turnStart'>, Runtime>[];
	chunk: WithContext<StreamObserverHandler<'chunk'>, Runtime>[];
	update: WithContext<StreamObserverHandler<'update'>, Runtime>[];
	turnEnd: WithContext<StreamObserverHandler<'turnEnd'>, Runtime>[];
	toolCall: WithContext<ToolObserverHandler<'toolCall'>, Runtime>[];
	toolResult: WithContext<ToolObserverHandler<'toolResult'>, Runtime>[];
	tools: ExtensionToolDefinition<unknown, Runtime>[];
};
