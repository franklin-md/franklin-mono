import type { Transcript, TranscriptEntry } from '../types.js';
import { match } from './match.js';

export function sends<M extends TranscriptEntry['method']>(
	t: Transcript,
	method: M,
): Extract<TranscriptEntry, { direction: 'send'; method: M }>[] {
	return t.filter(
		(e): e is Extract<TranscriptEntry, { direction: 'send'; method: M }> =>
			match(e, 'send', method),
	);
}

export function receives<M extends TranscriptEntry['method']>(
	t: Transcript,
	method: M,
): Extract<TranscriptEntry, { direction: 'receive'; method: M }>[] {
	return t.filter(
		(e): e is Extract<TranscriptEntry, { direction: 'receive'; method: M }> =>
			match(e, 'receive', method),
	);
}
