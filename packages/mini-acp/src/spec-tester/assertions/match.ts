import type { TranscriptEntry } from '../types.js';

export function match<
	D extends TranscriptEntry['direction'],
	M extends TranscriptEntry['method'],
>(
	e: TranscriptEntry,
	direction: D,
	method: M,
): e is Extract<TranscriptEntry, { direction: D; method: M }> {
	return e.direction === direction && e.method === method;
}
