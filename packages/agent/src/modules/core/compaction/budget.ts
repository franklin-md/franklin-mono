import { getModelContextWindow, type LLMConfig } from '@franklin/mini-acp';

const FALLBACK_CONTEXT_WINDOW_TOKENS = 32_768;
const MAX_TRIGGER_HEADROOM_TOKENS = 16_384;
const TRIGGER_HEADROOM_FRACTION = 0.25;

export function compactionBudget(config: LLMConfig) {
	// Unknown-model fallback is a planning assumption, not a provider guarantee.
	const contextWindow =
		getModelContextWindow(config) ?? FALLBACK_CONTEXT_WINDOW_TOKENS;
	// Retain the existing heuristic: reserve a fraction of smaller windows, capped
	// for larger ones. This is a soft compaction trigger; it does not account for
	// the output allowance actually sent by the adapter or guarantee request fit.
	const headroom = Math.min(
		MAX_TRIGGER_HEADROOM_TOKENS,
		Math.floor(contextWindow * TRIGGER_HEADROOM_FRACTION),
	);
	return {
		contextWindow,
		trigger: contextWindow - headroom,
	};
}
