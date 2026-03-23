export type {
	CoreAPI,
	CoreEvent,
	CoreEventHandler,
	CoreEventMap,
	StreamObserverEvent,
	StreamObserverHandler,
	StreamObserverParamsMap,
	ExtensionToolDefinition,
	MethodMiddleware,
	Middleware,
	ClientMiddleware,
	ServerMiddleware,
	FullMiddleware,
	StoreAPI,
	ReadonlyStore,
	Store,
	Sharing,
	StoreResult,
	StoreEntry,
	StoreKey,
	StoreValueType,
} from './api/index.js';
export { compose, composeMethod, passThrough } from './api/index.js';
export { apply } from './api/index.js';
export {
	shouldSnapshot,
	createStoreResult,
	createStore,
	storeKey,
} from './api/index.js';
export type { Compiler } from './compile/index.js';
export {
	compile,
	combine,
	compileAll,
	createCoreCompiler,
	createStoreCompiler,
} from './compile/index.js';
export type { Extension, MaybePromise } from './types/index.js';

// ---------------------------------------------------------------------------
// Built-in extensions
// ---------------------------------------------------------------------------
export {
	conversationExtension,
	conversationKey,
	todoExtension,
	todoKey,
	createTodoControl,
	formatTodos,
	spawnExtension,
} from './extensions/index.js';
export type {
	ConversationTurn,
	ConversationEntry,
	UserEntry,
	AgentTextEntry,
	AgentThoughtEntry,
	ToolCallEntry,
	Todo,
	TodoControl,
} from './extensions/index.js';
