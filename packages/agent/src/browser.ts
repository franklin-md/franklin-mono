/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Re-exports only the pieces that have zero Node.js transitive dependencies,
 * so they can be safely imported from an Electron renderer or any browser
 * environment. The full `@franklin/agent` barrel adds Node-only APIs
 * (StdioTransport, spawn, etc.) on top of these.
 */

export { AgentConnection } from './connection.js';
export { compose, sequence } from './stack.js';
export type { AgentStack, Middleware } from './stack.js';
export type { Transport } from './transport/index.js';
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
