/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Re-exports only the pieces that have zero Node.js transitive dependencies,
 * so they can be safely imported from an Electron renderer or any browser
 * environment. The full `@franklin/agent` barrel adds Node-only APIs
 * (StdioTransport, etc.) on top of these.
 */

// Environment
export type { AgentSpec } from './environment.js';

// Types
export type { AgentCommands } from './types.js';

// Agent — typed handle unifying commands, extension stores, and lifecycle
export {
	createAgent,
	SessionManager,
	emptyCtx,
	mergeCtx,
} from './agent/index.js';
export type {
	Agent,
	Session,
	SpawnFn,
	PersistenceOptions,
} from './agent/index.js';

// Persistence
export {
	SessionMap,
	snapshotSession,
	hydrateStores,
	Debouncer,
	createFileSessionPersister,
	createFilePoolPersister,
	createFilePersistence,
} from './agent/index.js';
export type {
	OnRestore,
	Persister,
	SessionSnapshot,
	StoreSnapshot,
	Filesystem,
	FileSystemOps,
	PersistenceFilesystem,
} from './agent/index.js';

// Re-export from @franklin/extensions for convenience
export {
	conversationExtension,
	todoExtension,
	createTodoControl,
	formatTodos,
	spawnExtension,
	compile,
	combine,
	compileAll,
	createCoreCompiler,
	createStoreCompiler,
	apply,
	createStore,
	storeKey,
	conversationKey,
	todoKey,
	StorePool,
} from '@franklin/extensions';
export type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
	Store,
	ReadonlyStore,
	Sharing,
	StoreKey,
	StoreValueType,
	FullMiddleware,
	ClientMiddleware,
	ServerMiddleware,
	ConversationTurn,
	Todo,
	TodoControl,
} from '@franklin/extensions';

// Re-export key mini-acp types so consumers don't need to depend on it directly
export type {
	MiniACPClient,
	MiniACPAgent,
	MiniACPProtocol,
	Content,
	UserContent,
	Chunk,
	Update,
	TurnEnd,
	ToolCall,
	ToolResult,
	ToolExecuteHandler,
} from '@franklin/mini-acp';
