import type { BaseRuntime } from '@franklin/extensibility';
import type {
	CancelHandler,
	PromptHandler,
	StreamObserverHandler,
	SystemPromptHandler,
	ToolObserverHandler,
} from '../../api/handlers.js';
import type { ExtensionToolDefinition } from '../../api/tool.js';
import type { WithRuntime } from '@franklin/extensibility';

/**
 * Accumulated registrations from extensions — transport-free data, not
 * yet bound to runtime. One field per event: dispatch is direct property
 * lookup, no Map indirection. `composeDecorators(registrations, getRuntime)`
 * binds these and produces the decorator stack.
 */
export type CoreRegistrar<Runtime extends BaseRuntime> = {
	prompt: WithRuntime<PromptHandler, Runtime>[];
	cancel: WithRuntime<CancelHandler, Runtime>[];
	systemPrompt: WithRuntime<SystemPromptHandler, Runtime>[];
	turnStart: WithRuntime<StreamObserverHandler<'turnStart'>, Runtime>[];
	chunk: WithRuntime<StreamObserverHandler<'chunk'>, Runtime>[];
	update: WithRuntime<StreamObserverHandler<'update'>, Runtime>[];
	turnEnd: WithRuntime<StreamObserverHandler<'turnEnd'>, Runtime>[];
	toolCall: WithRuntime<ToolObserverHandler<'toolCall'>, Runtime>[];
	toolResult: WithRuntime<ToolObserverHandler<'toolResult'>, Runtime>[];
	tools: ExtensionToolDefinition<unknown, Runtime>[];
};
