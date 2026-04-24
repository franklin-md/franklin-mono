import type { Slot } from './types.js';

/**
 * Partition slots into the cache bucket + non-cache bucket (each in
 * registration order) and return the concatenated, filtered fragment list.
 * Empty or undefined fragments are dropped. Joining is the caller's job.
 */
export function order(slots: readonly Slot[]): string[] {
	const cached: string[] = [];
	const uncached: string[] = [];
	for (const slot of slots) {
		if (!slot.content) continue;
		(slot.cache ? cached : uncached).push(slot.content);
	}
	return [...cached, ...uncached];
}
