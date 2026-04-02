import type { Action, TranscriptEntry } from '../types.js';

export function waitFor(
	predicate: (entry: TranscriptEntry) => boolean,
	timeoutMs?: number,
): Action {
	return { type: 'waitFor', predicate, timeoutMs };
}
