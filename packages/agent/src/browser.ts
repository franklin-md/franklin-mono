/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Re-exports only the pieces that have zero Node.js transitive dependencies,
 * so they can be safely imported from an Electron renderer or any browser
 * environment. The full `@franklin/agent` barrel adds Node-only APIs
 * (StdioTransport, etc.) on top of these.
 */

// Environment
export type {
	EnvironmentHandle,
	AgentSpec,
	ClientTransport,
} from './environment.js';

// Types
export type { AgentCommands } from './types.js';

// Agent — typed handle unifying commands, extension stores, and lifecycle
export { createAgent, AgentManager } from './agent/index.js';
export type { Agent, ManagedAgent } from './agent/index.js';

// Framework base class
export { Framework } from './framework.js';

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
} from '@franklin/extensions';
export type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
	Store,
	ReadonlyStore,
	Sharing,
	FullMiddleware,
	ClientMiddleware,
	ServerMiddleware,
	ConversationTurn,
	ConversationEntry,
	UserEntry,
	AgentTextEntry,
	AgentThoughtEntry,
	ToolCallEntry,
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
