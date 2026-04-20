// ---------------------------------------------------------------------------
// Usage — token counts and cost for a completed turn.
//
// `tokens.input`/`tokens.output` are the classic prompt/completion token
// counts. `tokens.cacheRead`/`tokens.cacheWrite` track prompt-cache traffic
// (Anthropic-style); providers that do not expose a cache distinction
// report 0 for both. `tokens.total` is the sum of all four.
//
// `cost.*` is the same breakdown in USD, supplied by the provider adapter;
// when pricing is unknown, fields are 0.
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
		total: number;
	};
};
