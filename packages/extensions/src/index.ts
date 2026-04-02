export type {
	CoreAPI,
	CoreEvent,
	CoreEventHandler,
	CoreEventMap,
	ExtensionToolDefinition,
	ToolDefinition,
	AnyToolDefinition,
	SerializedToolDefinition,
	ContentBlockResult,
	MethodMiddleware,
	Middleware,
	ClientMiddleware,
	ServerMiddleware,
	FullMiddleware,
	EnvironmentAPI,
	Environment,
	EnvironmentConfig,
	StoreAPI,
	ReadonlyStore,
	Store,
	Sharing,
	ForkMode,
	StoreResult,
	StoreKey,
	StoreValueType,
} from './api/index.js';
export { compose, composeMethod, passThrough } from './api/index.js';
export { isContentBlockResult } from './api/index.js';
export { serializeTool, toToolInputSchema } from './api/index.js';
export { apply } from './api/index.js';
export {
	createEmptyStoreResult,
	createStoreResult,
	createStore,
	storeKey,
} from './api/index.js';
export { StorePool } from './api/index.js';
export type {
	Persister,
	StoreEntry,
	StoreMapping,
	StoreSnapshot,
} from './api/index.js';
export type { Compiler } from './compile/index.js';
export type { EnvironmentResult } from './compile/index.js';
export {
	compile,
	combine,
	compileAll,
	createCoreCompiler,
	createStoreCompiler,
	createEnvironmentCompiler,
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
	statusExtension,
	statusKey,
	createTodoControl,
	createStatusControl,
	formatTodos,
	spawnExtension,
	globExtension,
	editExtension,
	writeExtension,
	readExtension,
} from './extensions/index.js';
export type {
	ConversationTurn,
	AssistantTurn,
	AssistantBlock,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
	Todo,
	TodoControl,
	StatusState,
	StatusControl,
} from './extensions/index.js';
