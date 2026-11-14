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

// These definitions are the reviewed Codex set and override Pi metadata.
// Adding a definition enables that ID without waiting for a Pi package release.
const OPENAI_CODEX_MODEL_OVERRIDES = {
	// Preserve saved sessions and picker entries removed from Pi's newer catalog.
	// Metadata matches pi-ai 0.75.4; these remain catalog estimates.
	'gpt-5.4': openAICodexModel({
		id: 'gpt-5.4',
		name: 'GPT-5.4',
		contextWindow: 272_000,
		cost: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 },
	}),
	'gpt-5.4-mini': openAICodexModel({
		id: 'gpt-5.4-mini',
		name: 'GPT-5.4 mini',
		contextWindow: 272_000,
		cost: { input: 0.75, output: 4.5, cacheRead: 0.075, cacheWrite: 0 },
	}),
	'gpt-5.5': openAICodexModel({
		id: 'gpt-5.5',
		name: 'GPT-5.5',
		contextWindow: 272_000,
		cost: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 0 },
	}),
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
	if (!Object.hasOwn(OPENAI_CODEX_MODEL_OVERRIDES, modelId)) return undefined;
	return OPENAI_CODEX_MODEL_OVERRIDES[
		modelId as keyof typeof OPENAI_CODEX_MODEL_OVERRIDES
	];
}
