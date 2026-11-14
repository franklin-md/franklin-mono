import type { SessionEntry } from './types.js';

export function validateEntries(entries: readonly SessionEntry[]): void {
	for (const entry of entries) {
		if (entry.type === 'compaction' && entry.summary.trim().length === 0)
			throw new Error('Invalid compaction summary');
	}
}
