// ---------------------------------------------------------------------------
// Usage translation between pi-ai and mini-acp
// ---------------------------------------------------------------------------
//
// pi-ai's Usage has a flat token surface (input/output/cacheRead/cacheWrite/
// totalTokens) plus a nested `cost` object. mini-acp's Usage groups tokens
// into a parallel `tokens` bucket so the two breakdowns are symmetric.
// We intentionally don't distinguish provider-reported totals from catalog
// estimates. Preserve Pi's best available total without carrying provenance.
// Revisit the distinction if useful: franklin-26r.

import type { Usage as PiUsage } from '@earendil-works/pi-ai';

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
		cost: {
			input: piUsage.cost.input,
			output: piUsage.cost.output,
			cacheRead: piUsage.cost.cacheRead,
			cacheWrite: piUsage.cost.cacheWrite,
			total: piUsage.cost.total,
		},
	};
}
