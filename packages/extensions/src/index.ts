export type {
	CoreAPI,
	CoreEvent,
	CoreEventHandler,
	CoreEventMap,
	ExtensionToolDefinition,
	ContentBlockResult,
	MethodMiddleware,
	Middleware,
	ClientMiddleware,
	ServerMiddleware,
	FullMiddleware,
	SandboxAPI,
	Sandbox,
	Filesystem,
	Terminal,
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
export { isContentBlockResult } from './api/index.js';
export { createLocalSandbox } from './api/index.js';
export { apply } from './api/index.js';
export {
	shouldSnapshot,
	createStoreResult,
	createStore,
	storeKey,
} from './api/index.js';
export type { Compiler } from './compile/index.js';
export type { SandboxResult } from './compile/index.js';
export {
	compile,
	combine,
	compileAll,
	createCoreCompiler,
	createStoreCompiler,
	createSandboxCompiler,
} from './compile/index.js';
export type { Extension, MaybePromise } from './types/index.js';
export { reduceExtensions } from './types/index.js';

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
	Todo,
	TodoControl,
} from './extensions/index.js';
export { bridgePiToolDefinition } from './api/sandbox/bridge.js';
