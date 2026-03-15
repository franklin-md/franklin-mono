export { createAgentConnection } from './connection.js';
export {
	commonAgentSpecs,
	claudeAgentSpec,
	codexAgentSpec,
} from './agents/index.js';
export { AgentRegistry, createDefaultRegistry } from './registry.js';
export {
	emptyMiddleware,
	joinCommands,
	joinEvents,
	sequence,
} from './stack/index.js';
export { spawn, spawnFromTransport } from './spawn.js';
export { StdioTransport, createMemoryTransport } from './transport/index.js';
export type { AgentSpec } from './registry.js';
export type {
	AgentSession,
	SpawnOptions,
	SpawnResult,
	SpawnFromTransportOptions,
} from './spawn.js';

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
export type { Transport, StdioTransportOptions } from './transport/index.js';
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
