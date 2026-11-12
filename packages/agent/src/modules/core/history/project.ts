import type { MessageEntry, SessionEntry } from './types.js';
import { createSummaryMessage } from './summary.js';

export function projectEntries(
	entries: readonly SessionEntry[],
): MessageEntry[] {
	let visible: MessageEntry[] = [];
	const ids = new Set<string>();
	const summaries = new Set<string>();
	for (const entry of entries) {
		if (ids.has(entry.id)) throw new Error('Duplicate session entry id');
		ids.add(entry.id);
		if (entry.type === 'message') {
			visible.push(entry);
			continue;
		}
		const start =
			entry.firstKeptEntryId === null
				? visible.length
				: visible.findIndex(
						(item) =>
							item.id === entry.firstKeptEntryId && !summaries.has(item.id),
					);
		if (start < 0) throw new Error('Invalid compaction boundary');
		summaries.add(entry.id);
		visible = [
			{
				type: 'message',
				id: entry.id,
				message: createSummaryMessage(entry.summary),
			},
			...visible.slice(start),
		];
	}
	return visible;
}
