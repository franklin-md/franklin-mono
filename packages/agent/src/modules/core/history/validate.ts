import type { SessionEntry } from './types.js';

export function validateEntries(entries: readonly SessionEntry[]): void {
	const ids = new Set<string>();
	for (const entry of entries) {
		if (entry.id.trim().length === 0)
			throw new Error('Invalid session entry id');
		if (ids.has(entry.id)) throw new Error('Duplicate session entry id');
		ids.add(entry.id);
		if (entry.type === 'compaction' && entry.summary.trim().length === 0)
			throw new Error('Invalid compaction summary');
	}
}
