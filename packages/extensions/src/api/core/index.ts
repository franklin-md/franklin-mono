import type { CoreEvent, CoreEventMap } from './events.js';
import type { ExtensionToolDefinition } from './tool.js';

export interface CoreAPI {
	on<TEvent extends CoreEvent>(
		event: TEvent,
		handler: CoreEventMap[TEvent],
	): void;
	registerTool<TInput, TOutput>(
		tool: ExtensionToolDefinition<TInput, TOutput>,
	): void;
}

export type {
	CoreEvent,
	CoreEventMap,
	PromptContext,
	PromptHandler,
	PromptTransform,
	SessionUpdateContext,
	SessionUpdateHandler,
} from './events.js';
export type { ExtensionToolDefinition } from './tool.js';
export type {
	MethodMiddleware,
	Middleware,
	ServerMiddleware,
	ClientMiddleware,
	FullMiddleware,
} from './middleware/index.js';
export { compose, composeMethod, passThrough } from './middleware/index.js';
export { apply } from './middleware/index.js';
