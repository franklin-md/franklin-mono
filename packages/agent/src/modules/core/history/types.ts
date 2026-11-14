import type { Message } from '@franklin/mini-acp';

export type MessageEntry = {
	readonly type: 'message';
	readonly id: string;
	readonly message: Message;
};

export type CompactionEntry = {
	readonly type: 'compaction';
	readonly id: string;
	readonly summary: string;
	// An original message in the current projection, never a prior summary ID.
	// Null replaces all preceding model-visible messages with this summary.
	readonly firstKeptEntryId: string | null;
};

export type SessionEntry = MessageEntry | CompactionEntry;
