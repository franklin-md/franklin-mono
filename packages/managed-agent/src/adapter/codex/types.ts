// ---------------------------------------------------------------------------
// Codex wire-format types — minimal subset needed by the adapter.
// Derived from the Codex app-server JSON-RPC protocol.
// ---------------------------------------------------------------------------

// -- Thread items -----------------------------------------------------------

export type CodexUserMessage = {
	type: 'userMessage';
	id: string;
	text?: string;
	content?: CodexUserInput[];
};

export type CodexAgentMessage = {
	type: 'agentMessage';
	id: string;
	text: string;
};

export type CodexReasoningItem = {
	type: 'reasoning';
	id: string;
	content?: string[];
	summary?: string[];
};

export type CodexThreadItem =
	| CodexUserMessage
	| CodexAgentMessage
	| CodexReasoningItem
	| { type: string; id: string };

// -- Notification params ----------------------------------------------------

export type ThreadStartedParams = {
	thread: { id: string };
};

export type TurnStartedParams = {
	turn: { id: string };
};

export type TurnCompletedParams = {
	turn: { id: string };
};

export type ItemStartedParams = {
	item: CodexThreadItem;
};

export type ItemCompletedParams = {
	item: CodexThreadItem;
};

export type AgentMessageDeltaParams = {
	item: { id: string };
	delta?: { text?: string };
};

export type ReasoningTextDeltaParams = {
	delta: string;
	contentIndex: number;
	itemId: string;
	threadId: string;
	turnId: string;
};

export type ReasoningSummaryTextDeltaParams = {
	delta: string;
	summaryIndex: number;
	itemId: string;
	threadId: string;
	turnId: string;
};

export type ErrorParams = {
	error: {
		code?: string;
		message: string;
		codexErrorInfo?: unknown;
		additionalDetails?: string | null;
	};
};

export type ThreadClosedParams = {
	thread: { id: string };
};

// -- Server-request params (require a response) ----------------------------

export type CommandApprovalParams = {
	item: { id: string };
	command: { command: string };
};

export type FileChangeApprovalParams = {
	item: { id: string };
	file: { path: string };
};

export type PermissionsApprovalParams = {
	item: { id: string };
	permissions: string[];
};

// -- Codex user input (sent with turn/start) --------------------------------

export type CodexUserInput = {
	type: 'text';
	text: string;
	text_elements: unknown[];
};

// -- Request / response param shapes ----------------------------------------

export type InitializeParams = {
	clientInfo: { name: string; version: string };
	capabilities?: { experimentalApi?: boolean };
};

export type ThreadStartParams = {
	experimentalRawEvents: boolean;
	persistExtendedHistory: boolean;
};

export type ThreadResumeParams = {
	threadId: string;
	experimentalRawEvents?: boolean;
	persistExtendedHistory: boolean;
};

export type ThreadForkParams = {
	threadId: string;
	experimentalRawEvents?: boolean;
	persistExtendedHistory: boolean;
};

export type TurnStartParams = {
	threadId: string;
	input: CodexUserInput[];
};

export type TurnInterruptParams = {
	threadId: string;
	turnId: string;
};
