import type { Slot } from './types.js';

/**
 * Partition slots into the cache bucket + non-cache bucket and return the
 * concatenated, filtered fragment list. Each bucket preserves handler order.
 * Empty or undefined fragments are dropped. Joining is the caller's job.
 */
export function order(slots: readonly Slot[]): string[] {
	const cached: Slot[] = [];
	const uncached: Slot[] = [];
	for (const slot of slots) {
		if (!slot.content) continue;
		(slot.cache ? cached : uncached).push(slot);
	}
	return [...cached, ...uncached].map((s) => s.content as string);
}
