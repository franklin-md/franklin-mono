import type {
	// Command (outbound) types
	AuthenticateRequest,
	AuthenticateResponse,
	CancelNotification,
	InitializeRequest,
	InitializeResponse,
	ListSessionsRequest,
	ListSessionsResponse,
	LoadSessionRequest,
	LoadSessionResponse,
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
	SetSessionConfigOptionRequest,
	SetSessionConfigOptionResponse,
	SetSessionModeRequest,
	SetSessionModeResponse,
	// Event (inbound) types
	CreateTerminalRequest,
	CreateTerminalResponse,
	KillTerminalRequest,
	KillTerminalResponse,
	ReadTextFileRequest,
	ReadTextFileResponse,
	ReleaseTerminalRequest,
	ReleaseTerminalResponse,
	RequestPermissionRequest,
	RequestPermissionResponse,
	SessionNotification,
	TerminalOutputRequest,
	TerminalOutputResponse,
	WaitForTerminalExitRequest,
	WaitForTerminalExitResponse,
	WriteTextFileRequest,
	WriteTextFileResponse,
} from '@agentclientprotocol/sdk';

import type { Middleware, ReadType, WriteType } from '@franklin/transport';

import type { AgentTransport } from './transport/index.js';

// ---------------------------------------------------------------------------
// AgentCommands — outbound methods the app sends to the agent
// ---------------------------------------------------------------------------

export interface AgentCommands {
	initialize(params: InitializeRequest): Promise<InitializeResponse>;
	newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
	loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse>;
	listSessions(params: ListSessionsRequest): Promise<ListSessionsResponse>;
	prompt(params: PromptRequest): Promise<PromptResponse>;
	cancel(params: CancelNotification): Promise<void>;
	setSessionMode(
		params: SetSessionModeRequest,
	): Promise<SetSessionModeResponse>;
	setSessionConfigOption(
		params: SetSessionConfigOptionRequest,
	): Promise<SetSessionConfigOptionResponse>;
	authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse>;
}

// ---------------------------------------------------------------------------
// AgentEvents — inbound callbacks the agent sends to the app
// ---------------------------------------------------------------------------

export interface AgentEvents {
	sessionUpdate(params: SessionNotification): Promise<void>;
	requestPermission(
		params: RequestPermissionRequest,
	): Promise<RequestPermissionResponse>;
	readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse>;
	writeTextFile(params: WriteTextFileRequest): Promise<WriteTextFileResponse>;
	createTerminal(
		params: CreateTerminalRequest,
	): Promise<CreateTerminalResponse>;
	terminalOutput(
		params: TerminalOutputRequest,
	): Promise<TerminalOutputResponse>;
	releaseTerminal(
		params: ReleaseTerminalRequest,
	): Promise<ReleaseTerminalResponse | undefined>;
	waitForTerminalExit(
		params: WaitForTerminalExitRequest,
	): Promise<WaitForTerminalExitResponse>;
	killTerminal(
		params: KillTerminalRequest,
	): Promise<KillTerminalResponse | undefined>;
}

// ---------------------------------------------------------------------------
// AgentMiddleware — transport wrapping
// ---------------------------------------------------------------------------

export type AgentMiddleware = Middleware<
	ReadType<AgentTransport>,
	WriteType<AgentTransport>
>;

// ---------------------------------------------------------------------------
// Method name lists
// ---------------------------------------------------------------------------

export const COMMAND_METHODS = [
	'initialize',
	'newSession',
	'loadSession',
	'listSessions',
	'prompt',
	'cancel',
	'setSessionMode',
	'setSessionConfigOption',
	'authenticate',
] as const satisfies readonly (keyof AgentCommands)[];

export const EVENT_METHODS = [
	'sessionUpdate',
	'requestPermission',
	'readTextFile',
	'writeTextFile',
	'createTerminal',
	'terminalOutput',
	'releaseTerminal',
	'waitForTerminalExit',
	'killTerminal',
] as const satisfies readonly (keyof AgentEvents)[];

export const NOTIFICATION_METHODS: ReadonlySet<string> = new Set([
	'sessionUpdate',
] as const satisfies readonly (keyof AgentEvents)[]);

export const ALL_METHODS = [...COMMAND_METHODS, ...EVENT_METHODS] as const;
