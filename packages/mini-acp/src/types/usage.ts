// ---------------------------------------------------------------------------
// Usage — token counts and cost for a completed turn.
//
// `tokens.input`/`tokens.output` are the classic prompt/completion token
// counts. `tokens.cacheRead`/`tokens.cacheWrite` track prompt-cache traffic
// (Anthropic-style); providers that do not expose a cache distinction
// report 0 for both. `tokens.total` is the sum of all four.
//
// Cost components are catalog estimates in USD (unknown prices are 0).
// The optional total uses provider billing when available, otherwise an estimate.
// We don't distinguish these sources; totals need not equal the component sum.
// ---------------------------------------------------------------------------

export type Usage = {
	tokens: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		total: number;
	};
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		/** Best available USD total; absent if any contributing total is unknown. */
		total?: number;
	};
};
