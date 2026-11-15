import type { Message } from '@franklin/mini-acp';
import type { SessionEntry } from './types.js';
import { createSummaryMessage } from './summary.js';
import { validateEntries } from './validate.js';

export function projectEntries(entries: readonly SessionEntry[]): Message[] {
	validateEntries(entries);
	let visible: Message[] = [];
	for (const entry of entries) {
		switch (entry.type) {
			case 'message':
				visible.push(entry.message);
				break;
			case 'compaction':
				visible = [createSummaryMessage(entry.summary)];
				break;
		}
	}
	return visible;
}
