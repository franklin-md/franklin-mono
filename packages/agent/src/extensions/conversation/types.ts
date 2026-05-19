import type {
	UserMessage,
	ToolCallContent,
	ToolResultContent,
	StopCode,
	Usage,
} from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// AssistantTurn — everything the assistant does in response
// ---------------------------------------------------------------------------

// Lifecycle metadata attached to every assistant block. `endedAt` is left
// undefined while the block is still open (streaming text/thinking, or a
// tool call awaiting its result); setting it marks the block complete.
export type BlockMetadata = { startedAt: number; endedAt?: number };

export type TextBlock = { kind: 'text'; text: string } & BlockMetadata;
export type ThinkingBlock = { kind: 'thinking'; text: string } & BlockMetadata;
export type ToolUseBlock = {
	kind: 'toolUse';
	call: ToolCallContent;
	result?: ToolResultContent[];
	isError?: boolean;
} & BlockMetadata;
export type TurnEndBlock = {
	kind: 'turnEnd';
	stopCode: StopCode;
	stopMessage?: string;
	usage?: Usage;
} & BlockMetadata;

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
