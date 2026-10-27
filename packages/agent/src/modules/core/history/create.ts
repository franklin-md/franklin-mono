import type { Message } from '@franklin/mini-acp';
import type { MessageEntry } from './types.js';

export function createMessageEntries(
	messages: readonly Message[],
	prefix?: string,
): MessageEntry[] {
	return messages.map((message, index) => ({
		type: 'message',
		id: prefix === undefined ? crypto.randomUUID() : `${prefix}-${index}`,
		message: structuredClone(message),
	}));
}
