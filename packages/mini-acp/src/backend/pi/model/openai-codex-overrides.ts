import type { Model } from '@earendil-works/pi-ai';

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
const OPENAI_CODEX_MODEL_OVERRIDES = {
	// GPT-5.6 preview metadata (2026-07-10):
	// - Codex catalog: effective 372K context window and supported modalities.
	// - Preview help: model IDs, token prices, and 1.25x cache-write pricing.
	// pi-ai does not yet publish these preview models, so retain its current
	// 128K Codex output cap until upstream provides model-specific metadata.
	// https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json
	// https://help.openai.com/en/articles/20001325-a-preview-of-gpt-5-6-sol-terra-and-luna
	'gpt-5.6-sol': {
		id: 'gpt-5.6-sol',
		name: 'GPT-5.6 Sol',
		api: 'openai-codex-responses',
		provider: 'openai-codex',
		baseUrl: 'https://chatgpt.com/backend-api',
		reasoning: true,
		thinkingLevelMap: { minimal: 'low', xhigh: 'xhigh' },
		input: ['text', 'image'],
		cost: {
			input: 5,
			output: 30,
			cacheRead: 0.5,
			cacheWrite: 6.25,
		},
		contextWindow: 372_000,
		maxTokens: 128_000,
	},
	'gpt-5.6-terra': {
		id: 'gpt-5.6-terra',
		name: 'GPT-5.6 Terra',
		api: 'openai-codex-responses',
		provider: 'openai-codex',
		baseUrl: 'https://chatgpt.com/backend-api',
		reasoning: true,
		thinkingLevelMap: { minimal: 'low', xhigh: 'xhigh' },
		input: ['text', 'image'],
		cost: {
			input: 2.5,
			output: 15,
			cacheRead: 0.25,
			cacheWrite: 3.125,
		},
		contextWindow: 372_000,
		maxTokens: 128_000,
	},
} as const satisfies Record<string, Model<'openai-codex-responses'>>;

export function getOpenAICodexModelOverride(
	modelId: string,
): Model<'openai-codex-responses'> | undefined {
	return OPENAI_CODEX_MODEL_OVERRIDES[
		modelId as keyof typeof OPENAI_CODEX_MODEL_OVERRIDES
	];
}
