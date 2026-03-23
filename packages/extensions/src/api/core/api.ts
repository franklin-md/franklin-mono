import type { ExtensionToolDefinition } from './tool.js';
import type { CoreEventHandler } from './events.js';

export interface CoreAPI {
	// TODO: Write out the handler types explicitly

	on(event: 'initialize', handler: CoreEventHandler<'initialize'>): void;
	on(event: 'setContext', handler: CoreEventHandler<'setContext'>): void;
	on(event: 'prompt', handler: CoreEventHandler<'prompt'>): void;
	on(event: 'cancel', handler: CoreEventHandler<'cancel'>): void;

	registerTool<TInput, TOutput>(
		tool: ExtensionToolDefinition<TInput, TOutput>,
	): void;
}
