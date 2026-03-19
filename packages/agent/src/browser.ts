/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Re-exports only the pieces that have zero Node.js transitive dependencies,
 * so they can be safely imported from an Electron renderer or any browser
 * environment. The full `@franklin/agent` barrel adds Node-only APIs
 * (StdioTransport, spawn, etc.) on top of these.
 */

// Environment
export type { EnvironmentHandle, AgentSpec } from './environment.js';

// Extensions (browser-safe — compileExtension only depends on @franklin/local-mcp/browser)
export {
	compileExtension,
	TodoExtension,
	ConversationExtension,
	createTodoControl,
} from './extensions/index.js';
export type {
	Extension,
	ExtensionAPI,
	ExtensionToolDefinition,
	McpTransportFactory,
	PromptHandler,
	SessionStartHandler,
	SessionUpdateHandler,
	Todo,
	AgentTextEntry,
	AgentThoughtEntry,
	ConversationEntry,
	ConversationTurn,
	ToolCallEntry,
	UserEntry,
} from './extensions/index.js';

// Connection
export { createAgentConnection } from './connection.js';
export type { AgentConnection } from './connection.js';

// Types
export type { AgentCommands, AgentEvents } from './types.js';

// Middleware
export { emptyMiddleware } from './middleware/empty.js';
export { joinCommands, joinEvents } from './middleware/join.js';
export { sequence } from './middleware/sequence.js';
export { composeAll } from './middleware/compose.js';
export { fillHandler } from './stack/fill-handler.js';
export { COMMAND_METHODS, EVENT_METHODS } from './middleware/types.js';
export type {
	CommandMiddleware,
	Cont,
	EventMiddleware,
	Middleware,
} from './middleware/types.js';
export type { AgentTransport as Transport } from './transport/index.js';

// Store (browser-safe — immer is pure JS, no Node deps)
export {
	createStore,
	createSharedStore,
	createPrivateStore,
} from './store/index.js';
export type { ReadonlyStore, Store } from './store/index.js';

// Framework base class
export { Framework } from './framework.js';

// Re-export key ACP types so consumers don't need to depend on the SDK directly
export type {
	Agent,
	AnyMessage,
	Client,
	AuthenticateRequest,
	AuthenticateResponse,
	CancelNotification,
	CreateTerminalRequest,
	CreateTerminalResponse,
	InitializeRequest,
	InitializeResponse,
	KillTerminalRequest,
	KillTerminalResponse,
	ListSessionsRequest,
	ListSessionsResponse,
	LoadSessionRequest,
	LoadSessionResponse,
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
	ReadTextFileRequest,
	ReadTextFileResponse,
	ReleaseTerminalRequest,
	ReleaseTerminalResponse,
	RequestPermissionRequest,
	RequestPermissionResponse,
	SessionNotification,
	SetSessionConfigOptionRequest,
	SetSessionConfigOptionResponse,
	SetSessionModeRequest,
	SetSessionModeResponse,
	Stream,
	TerminalOutputRequest,
	TerminalOutputResponse,
	WaitForTerminalExitRequest,
	WaitForTerminalExitResponse,
	WriteTextFileRequest,
	WriteTextFileResponse,
} from '@agentclientprotocol/sdk';
export {
	RequestError,
	ndJsonStream,
	PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk';
