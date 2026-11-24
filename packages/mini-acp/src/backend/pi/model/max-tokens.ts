import type { Api, Model } from '@earendil-works/pi-ai';

// OpenRouter output cap (2026-11-23):
// - Without a caller cap, Pi requests model.maxTokens as max_tokens
//   (pi-ai 1.6.0 buildBaseOptions). OpenRouter pre-authorizes credit for the
//   full requested output before routing, so the reservation scales with
//   max_tokens × output price, not with what the turn actually costs.
// - Gemini 4 publishes 943,718 output tokens (https://openrouter.ai/api/v1/models).
//   At Neon's $15/M that reserved ~$14 per request, and a key with ~$10 left
//   failed every turn with 402 "requires more credits, or fewer max_tokens".
// - The cap applies to every OpenRouter model, because the reservation is
//   OpenRouter behavior, not Gemini's. Most curated picks drop to 64k, e.g.
//   Claude Opus 5.5 / Fable 5.2 128k → 64k and Grok 4.7 450k → 64k; models
//   already below the cap keep their own limit. Other providers keep Pi's
//   default, so the same model can have a higher ceiling elsewhere.
// - 64k is the prior Gemini (2.5–3.8) output ceiling and leaves room for
//   reasoning plus a large answer in one step. Reservation at the cap: Neon
//   ~$1, Opus 5.5 ~$1.3, Fable 5.2 ~$2.6. If low-balance 402s recur on pricier
//   models, make the cap price-aware rather than lowering it for everyone.
// - Hitting the cap ends the step with StopCode.MaxTokens. resolveModel still
//   reports the catalog maxTokens; this is a request policy, not model metadata.
const OPENROUTER_MAX_OUTPUT_TOKENS = 65_536;

// Undefined leaves Pi's default (model.maxTokens) in place.
export function requestMaxTokens(model: Model<Api>): number | undefined {
	if (model.provider !== 'openrouter') return undefined;
	return Math.min(model.maxTokens, OPENROUTER_MAX_OUTPUT_TOKENS);
}
