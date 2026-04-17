import type { ExtensionToolDefinition, ToolExecuteReturn } from './tool.js';
import type { ToolSpec } from './tool-spec.js';
import type {
	CancelHandler,
	PromptHandler,
	StreamObserverHandler,
	ToolObserverHandler,
} from './events.js';
import type { MaybePromise } from '../../../algebra/types/shared.js';

export interface CoreAPI {
	// Request events — prompt contributions plus cancellation handling.
	on(event: 'prompt', handler: PromptHandler): void;
	on(event: 'cancel', handler: CancelHandler): void;

	// Stream observer events — fire-and-forget on response stream
	on(event: 'chunk', handler: StreamObserverHandler<'chunk'>): void;
	on(event: 'update', handler: StreamObserverHandler<'update'>): void;
	on(event: 'turnEnd', handler: StreamObserverHandler<'turnEnd'>): void;

	// Tool observer events — fire-and-forget on tool execution lifecycle
	on(event: 'toolCall', handler: ToolObserverHandler<'toolCall'>): void;
	on(event: 'toolResult', handler: ToolObserverHandler<'toolResult'>): void;

	registerTool<TInput>(tool: ExtensionToolDefinition<TInput>): void;

	registerTool<TArgs>(
		spec: ToolSpec<string, TArgs>,
		execute: (params: TArgs) => MaybePromise<ToolExecuteReturn>,
	): void;
}
