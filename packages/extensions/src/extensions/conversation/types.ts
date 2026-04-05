import type {
	UserMessage,
	ToolCallContent,
	ToolResultContent,
	StopReason,
} from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// AssistantTurn — everything the assistant does in response
// ---------------------------------------------------------------------------

export type TextBlock = { kind: 'text'; text: string };
export type ThinkingBlock = { kind: 'thinking'; text: string };
export type ToolUseBlock = {
	kind: 'toolUse';
	call: ToolCallContent;
	result?: ToolResultContent[];
	isError?: boolean;
};
export type TurnEndBlock = {
	kind: 'turnEnd';
	stopReason: StopReason;
	stopMessage?: string;
};

export type AssistantBlock =
	| TextBlock
	| ThinkingBlock
	| ToolUseBlock
	| TurnEndBlock;

export type AssistantTurn = {
	blocks: AssistantBlock[];
};

// ---------------------------------------------------------------------------
// ConversationTurn — one user prompt → the assistant's full response
// ---------------------------------------------------------------------------

export interface ConversationTurn {
	id: string;
	timestamp: number;
	prompt: UserMessage;
	response: AssistantTurn;
}
