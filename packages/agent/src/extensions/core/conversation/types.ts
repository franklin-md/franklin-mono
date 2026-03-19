import type {
	ContentBlock,
	ToolCallContent,
	ToolCallLocation,
	ToolCallStatus,
	ToolKind,
} from '@agentclientprotocol/sdk';

// ---------------------------------------------------------------------------
// Conversation entries — a flat, ordered transcript of everything in a turn
// ---------------------------------------------------------------------------

export interface UserEntry {
	type: 'user';
	content: ContentBlock[];
}

/**
 * Coalesced agent text — many `agent_message_chunk` events with the same
 * `messageId` get flattened into a single entry.
 */
export interface AgentTextEntry {
	type: 'text';
	messageId: string;
	content: ContentBlock[];
}

/**
 * Coalesced agent thought — same flattening as text, for
 * `agent_thought_chunk` events.
 */
export interface AgentThoughtEntry {
	type: 'thought';
	messageId: string;
	content: ContentBlock[];
}

/**
 * Assembled from `tool_call` + subsequent `tool_call_update` events.
 */
export interface ToolCallEntry {
	type: 'tool_call';
	toolCallId: string;
	title: string;
	status?: ToolCallStatus;
	kind?: ToolKind;
	content?: ToolCallContent[];
	rawInput?: unknown;
	rawOutput?: unknown;
	locations?: ToolCallLocation[];
}

export type ConversationEntry =
	| UserEntry
	| AgentTextEntry
	| AgentThoughtEntry
	| ToolCallEntry;

// ---------------------------------------------------------------------------
// A complete turn: one user prompt → all agent output until next prompt
// ---------------------------------------------------------------------------

export interface ConversationTurn {
	id: string;
	timestamp: number;
	entries: ConversationEntry[];
}
