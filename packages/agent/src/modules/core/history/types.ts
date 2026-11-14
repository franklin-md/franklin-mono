import type { Message } from '@franklin/mini-acp';

export type MessageEntry = {
	readonly type: 'message';
	readonly message: Message;
};

export type CompactionEntry = {
	readonly type: 'compaction';
	readonly summary: string;
};

export type SessionEntry = MessageEntry | CompactionEntry;
