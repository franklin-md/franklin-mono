import type { Message } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// A complete turn: one user prompt → all messages until next prompt
// ---------------------------------------------------------------------------

export interface ConversationTurn {
	id: string;
	timestamp: number;
	messages: Message[];
}
