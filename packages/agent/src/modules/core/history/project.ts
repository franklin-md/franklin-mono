import type { MessageEntry, SessionEntry } from './types.js';
import { createSummaryMessage } from './summary.js';
import { validateEntries } from './validate.js';

export function projectEntries(
	entries: readonly SessionEntry[],
): MessageEntry[] {
	validateEntries(entries);
	let visible: MessageEntry[] = [];
	for (const entry of entries) {
		switch (entry.type) {
			case 'message':
				visible.push(entry);
				break;
			case 'compaction':
				visible = [
					{
						type: 'message',
						id: entry.id,
						message: createSummaryMessage(entry.summary),
					},
				];
				break;
		}
	}
	return visible;
}
