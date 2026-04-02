// ---------------------------------------------------------------------------
// Spec points — empty placeholder
//
// Spec points will be added as the Mini-ACP specification is defined.
// Each point is a predicate over a Transcript that returns pass/fail/skip.
// ---------------------------------------------------------------------------

import type { SpecPoint, TranscriptEntry } from './types.js';

export const specPoints: SpecPoint[] = [
	{
		id: 'INIT-1',
		description: 'initialize send must exist',
		test: (t) => {
			return t.some(
				(e: TranscriptEntry) =>
					e.direction === 'send' && e.method === 'initialize',
			)
				? 'pass'
				: 'fail';
		},
	},
];
