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
};

export type SessionEntry = MessageEntry | CompactionEntry;
