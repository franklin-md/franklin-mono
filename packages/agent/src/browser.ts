/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Re-exports only the pieces that have zero Node.js transitive dependencies,
 * so they can be safely imported from an Electron renderer or any browser
 * environment. The full `@franklin/agent` barrel adds Node-only APIs
 * (StdioTransport, spawn, etc.) on top of these.
 */

export { createAgentConnection } from './connection.js';
export {
	emptyMiddleware,
	joinCommands,
	joinEvents,
	sequence,
} from './stack/index.js';
export type { AgentConnection } from './connection.js';
export type {
	AgentCommands,
	AgentEvents,
	AgentLifecycle,
	AgentStack,
	CommandMiddleware,
	Cont,
	EventMiddleware,
	Middleware,
} from './stack/index.js';
export type { AgentTransport as Transport } from './transport/index.js';
export {
	createModuleMiddleware,
	createThreadModule,
	SystemPromptBuilder,
} from './middleware/modules/index.js';
export type {
	FranklinModule,
	ModuleCreateContext,
	ModuleCreateResult,
	ModulePromptContext,
	ThreadRequest,
	ThreadModuleOptions,
} from './middleware/modules/index.js';

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
