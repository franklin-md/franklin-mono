export type { CoreAPI } from './api.js';
export type {
	CoreEvent,
	CoreEventHandler,
	CoreEventMap,
	StreamObserverEvent,
	StreamObserverHandler,
	StreamObserverParamsMap,
	ToolObserverEvent,
	ToolObserverHandler,
	ToolObserverParamsMap,
} from './events.js';
export type { ExtensionToolDefinition } from './tool.js';
export type {
	ToolDefinition,
	AnyToolDefinition,
	SerializedToolDefinition,
} from './tools/index.js';
export { serializeTool, toToolInputSchema } from './tools/index.js';
export type { ContentBlockResult } from './content-block.js';
export { isContentBlockResult } from './content-block.js';
export type {
	MethodMiddleware,
	Middleware,
	ClientMiddleware,
	ServerMiddleware,
	FullMiddleware,
} from './middleware/index.js';
export { compose, composeMethod, passThrough } from './middleware/index.js';
export { apply } from './middleware/index.js';
