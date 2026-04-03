import type { ExtensionToolDefinition } from './tool.js';
import type {
	CoreEventHandler,
	StreamObserverHandler,
	ToolObserverHandler,
} from './events.js';

export interface CoreAPI {
	// Request events — waterfall transform on outgoing requests
	// TODO: I think we should remove these 2
	on(event: 'initialize', handler: CoreEventHandler<'initialize'>): void;
	on(event: 'setContext', handler: CoreEventHandler<'setContext'>): void;

	on(event: 'prompt', handler: CoreEventHandler<'prompt'>): void;
	on(event: 'cancel', handler: CoreEventHandler<'cancel'>): void;

	// Stream observer events — fire-and-forget on response stream
	on(event: 'chunk', handler: StreamObserverHandler<'chunk'>): void;
	on(event: 'update', handler: StreamObserverHandler<'update'>): void;
	on(event: 'turnEnd', handler: StreamObserverHandler<'turnEnd'>): void;

	// Tool observer events — fire-and-forget on tool execution lifecycle
	on(event: 'toolCall', handler: ToolObserverHandler<'toolCall'>): void;
	on(event: 'toolResult', handler: ToolObserverHandler<'toolResult'>): void;

	registerTool<TInput, TOutput>(
		tool: ExtensionToolDefinition<TInput, TOutput>,
	): void;
}
