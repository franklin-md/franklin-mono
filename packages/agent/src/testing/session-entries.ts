import type { Message } from '@franklin/mini-acp';
import type { SessionEntry } from '../modules/core/history/types.js';

export function createMessageEntries(messages: Message[]): SessionEntry[] {
	return messages.map((message) => ({ type: 'message', message }));
}
