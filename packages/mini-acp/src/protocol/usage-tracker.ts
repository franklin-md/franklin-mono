import type { Usage } from '../types/usage.js';

// ---------------------------------------------------------------------------
// Zero-valued Usage — the additive identity. Safe to use as an initial seed.
// ---------------------------------------------------------------------------

export const ZERO_USAGE: Usage = Object.freeze({
	tokens: Object.freeze({
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0,
	}),
	cost: Object.freeze({
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0,
	}),
}) as Usage;

// ---------------------------------------------------------------------------
// Pure merge — element-wise sum on tokens and cost.
// ---------------------------------------------------------------------------

function mergeUsage(a: Usage, b: Usage): Usage {
	return {
		tokens: {
			input: a.tokens.input + b.tokens.input,
			output: a.tokens.output + b.tokens.output,
			cacheRead: a.tokens.cacheRead + b.tokens.cacheRead,
			cacheWrite: a.tokens.cacheWrite + b.tokens.cacheWrite,
			total: a.tokens.total + b.tokens.total,
		},
		cost: {
			input: a.cost.input + b.cost.input,
			output: a.cost.output + b.cost.output,
			cacheRead: a.cost.cacheRead + b.cost.cacheRead,
			cacheWrite: a.cost.cacheWrite + b.cost.cacheWrite,
			total: a.cost.total + b.cost.total,
		},
	};
}

// ---------------------------------------------------------------------------
// UsageTracker — mutable accumulator for per-session usage.
// ---------------------------------------------------------------------------

/**
 * Tracks running Usage totals for a session.
 *
 * Seed by calling `add(persistedUsage)` on setup; call `add(turnUsage)` each
 * time a turn ends. Used alongside `CtxTracker` in the core runtime so that
 * persisted session state includes a running token/cost tally.
 */
export class UsageTracker {
	private usage: Usage = ZERO_USAGE;

	add(delta: Usage): void {
		this.usage = mergeUsage(this.usage, delta);
	}

	get(): Usage {
		return this.usage;
	}
}
