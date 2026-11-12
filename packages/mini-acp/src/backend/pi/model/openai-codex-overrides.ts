import type { Model } from '@earendil-works/pi-ai';

type OpenAICodexModel = Model<'openai-codex-responses'>;

function openAICodexModel({
	id,
	name,
	cost,
	contextWindow = 372_000,
	thinkingLevelMap = { minimal: 'low', xhigh: 'xhigh' },
}: {
	id: string;
	name: string;
	cost: OpenAICodexModel['cost'];
	contextWindow?: number;
	thinkingLevelMap?: OpenAICodexModel['thinkingLevelMap'];
}): OpenAICodexModel {
	return {
		id,
		name,
		api: 'openai-codex-responses',
		provider: 'openai-codex',
		baseUrl: 'https://chatgpt.com/backend-api',
		reasoning: true,
		thinkingLevelMap,
		input: ['text', 'image'],
		cost,
		contextWindow,
		maxTokens: 128_000,
	};
}

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
const OPENAI_CODEX_MODEL_OVERRIDES = {
	// GPT-6 metadata (2026-09-29) combines the Codex CLI 0.159.0 catalog's
	// 272K subscription-backend context with the public API pricing and output cap.
	// https://learn.chatgpt.com/docs/changelog
	// https://developers.openai.com/api/docs/models/gpt-6-astra
	// https://developers.openai.com/api/docs/models/gpt-6.1-sol
	'gpt-6-astra': openAICodexModel({
		id: 'gpt-6-astra',
		name: 'GPT-6-Astra',
		contextWindow: 272_000,
		thinkingLevelMap: { off: null, minimal: 'low', xhigh: 'xhigh' },
		cost: {
			input: 10,
			output: 50,
			cacheRead: 1,
			cacheWrite: 12.5,
		},
	}),
	'gpt-6.1-sol': openAICodexModel({
		id: 'gpt-6.1-sol',
		name: 'GPT-6.1-Sol',
		contextWindow: 272_000,
		thinkingLevelMap: { off: null, minimal: 'low', xhigh: 'xhigh' },
		cost: {
			input: 2,
			output: 10,
			cacheRead: 0.1,
			cacheWrite: 2.5,
		},
	}),
	// GPT-5.6 Terra/Luna preview metadata (2026-07-10):
	// - Codex catalog: effective 372K context window and supported modalities.
	// - Preview help: model IDs, token prices, and 1.25x cache-write pricing.
	// pi-ai does not yet publish these preview models, so retain its current
	// 128K Codex output cap until upstream provides model-specific metadata.
	// https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json
	// https://help.openai.com/en/articles/20001325-a-preview-of-gpt-5-6-sol-terra-and-luna
	'gpt-5.6-terra': openAICodexModel({
		id: 'gpt-5.6-terra',
		name: 'GPT-5.6 Terra',
		cost: {
			input: 2.5,
			output: 15,
			cacheRead: 0.25,
			cacheWrite: 3.125,
		},
	}),
	'gpt-5.6-luna': openAICodexModel({
		id: 'gpt-5.6-luna',
		name: 'GPT-5.6 Luna',
		cost: {
			input: 1,
			output: 6,
			cacheRead: 0.1,
			cacheWrite: 1.25,
		},
	}),
} as const satisfies Record<string, OpenAICodexModel>;

export function getOpenAICodexModelOverride(
	modelId: string,
): Model<'openai-codex-responses'> | undefined {
	return OPENAI_CODEX_MODEL_OVERRIDES[
		modelId as keyof typeof OPENAI_CODEX_MODEL_OVERRIDES
	];
}
