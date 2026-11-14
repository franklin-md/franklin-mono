import type { MessageEntry, SessionEntry } from './types.js';
import { createSummaryMessage } from './summary.js';
import { validateBoundary } from './boundary.js';

export function projectEntries(
	entries: readonly SessionEntry[],
): MessageEntry[] {
	let visible: MessageEntry[] = [];
	const ids = new Set<string>();
	const summaries = new Set<string>();
	for (const entry of entries) {
		if (entry.id.trim().length === 0)
			throw new Error('Invalid session entry id');
		if (ids.has(entry.id)) throw new Error('Duplicate session entry id');
		ids.add(entry.id);
		if (entry.type === 'message') {
			visible.push(entry);
			continue;
		}
		if (entry.summary.trim().length === 0)
			throw new Error('Invalid compaction summary');
		const start =
			entry.firstKeptEntryId === null
				? visible.length
				: visible.findIndex(
						(item) =>
							item.id === entry.firstKeptEntryId && !summaries.has(item.id),
					);
		if (start < 0) throw new Error('Invalid compaction boundary');
		validateBoundary(visible, start);
		summaries.add(entry.id);
		// Reduce the current projection, never the raw log: a later fence replaces
		// the entire earlier summary and cannot resurrect an already hidden prefix.
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
