import type { Slot } from './types.js';

/**
 * Partition slots into the cache bucket + non-cache bucket and return the
 * concatenated, filtered fragment list. Within each bucket, fragments sort
 * by `priority` descending; ties preserve handler registration order
 * (Array.prototype.sort is stable since ES2019). Empty or undefined
 * fragments are dropped. Joining is the caller's job.
 */
export function order(slots: readonly Slot[]): string[] {
	const cached: Slot[] = [];
	const uncached: Slot[] = [];
	for (const slot of slots) {
		if (!slot.content) continue;
		(slot.cache ? cached : uncached).push(slot);
	}
	const byPriorityDesc = (a: Slot, b: Slot): number => b.priority - a.priority;
	cached.sort(byPriorityDesc);
	uncached.sort(byPriorityDesc);
	return [...cached, ...uncached].map((s) => s.content as string);
}
