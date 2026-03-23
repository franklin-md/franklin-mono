import type { Content, UserContent } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Conversation entries — a flat, ordered transcript of everything in a turn
// ---------------------------------------------------------------------------

export interface UserEntry {
	type: 'user';
	content: UserContent[];
}

/**
 * Coalesced agent text — multiple chunk events with the same
 * `messageId` are flattened into a single entry.
 */
export interface AgentTextEntry {
	type: 'text';
	messageId: string;
	content: Content[];
}

/**
 * Coalesced agent thought — same flattening as text, for
 * thinking content chunks.
 */
export interface AgentThoughtEntry {
	type: 'thought';
	messageId: string;
	content: Content[];
}

/**
 * A tool call from the assistant. Simplified from ACP — just the
 * call metadata from the ToolCallContent chunk.
 */
export interface ToolCallEntry {
	type: 'toolCall';
	id: string;
	name: string;
	arguments: Record<string, unknown>;
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
