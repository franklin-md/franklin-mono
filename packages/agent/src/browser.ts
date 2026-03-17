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

// Middleware stack
export {
	emptyMiddleware,
	joinCommands,
	joinEvents,
	sequence,
	COMMAND_METHODS,
	EVENT_METHODS,
} from './stack/index.js';
export type {
	AgentCommands,
	AgentEvents,
	CommandMiddleware,
	Cont,
	EventMiddleware,
	Middleware,
} from './stack/index.js';
export type { AgentTransport as Transport } from './transport/index.js';

// Store (browser-safe — immer is pure JS, no Node deps)
export { createStore } from './store/index.js';
export type { ReadonlyStore, Store } from './store/index.js';

// Framework base class
export { Framework } from './framework.js';

// Spawn helpers (browser-safe — no Node deps)
export { fillHandler, composeAll } from './spawn.js';

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
