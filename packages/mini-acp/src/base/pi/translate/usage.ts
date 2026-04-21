// ---------------------------------------------------------------------------
// Usage translation between pi-ai and mini-acp
// ---------------------------------------------------------------------------
//
// pi-ai's Usage has a flat token surface (input/output/cacheRead/cacheWrite/
// totalTokens) plus a nested `cost` object. mini-acp's Usage groups tokens
// into a parallel `tokens` bucket so the two breakdowns are symmetric.
// `cost` passes through verbatim — pi-ai's cost object already matches the
// mini-acp shape.

import type { Usage as PiUsage } from '@mariozechner/pi-ai';

import type { Usage } from '../../../types/usage.js';

export function fromPiUsage(piUsage: PiUsage): Usage {
	return {
		tokens: {
			input: piUsage.input,
			output: piUsage.output,
			cacheRead: piUsage.cacheRead,
			cacheWrite: piUsage.cacheWrite,
			total: piUsage.totalTokens,
		},
		cost: piUsage.cost,
	};
}
