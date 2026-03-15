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
// AgentLifecycle — teardown
// ---------------------------------------------------------------------------

// TODO: Remove this from AgentControl and AgentStack. The MiddleWare should not be
// disposed like this.
export interface AgentLifecycle {
	dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// AgentStack — full duplex (backward compat)
// ---------------------------------------------------------------------------

export type AgentStack = AgentCommands & AgentEvents & AgentLifecycle;
