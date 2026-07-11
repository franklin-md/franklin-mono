import type { Model } from '@earendil-works/pi-ai';

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
const OPENROUTER_MODEL_OVERRIDES = {
	// OpenRouter model API metadata (2026-07-10):
	// https://openrouter.ai/api/v1/models
	'x-ai/grok-4.5': {
		id: 'x-ai/grok-4.5',
		name: 'xAI: Grok 4.5',
		api: 'openai-completions',
		provider: 'openrouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		reasoning: true,
		thinkingLevelMap: { off: null, minimal: 'low' },
		input: ['text', 'image'],
		cost: {
			input: 2,
			output: 6,
			cacheRead: 0.5,
			cacheWrite: 0,
		},
		contextWindow: 500_000,
		maxTokens: 4_096,
	},
	// OpenRouter model API metadata (2026-05-23):
	// https://openrouter.ai/api/v1/models
	'google/gemini-3.5-flash': {
		id: 'google/gemini-3.5-flash',
		name: 'Google: Gemini 3.5 Flash',
		api: 'openai-completions',
		provider: 'openrouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		reasoning: true,
		input: ['text', 'image'],
		cost: {
			input: 1.5,
			output: 9,
			cacheRead: 0.15,
			cacheWrite: 0.08333333333333334,
		},
		contextWindow: 1_048_576,
		maxTokens: 65_536,
	},
	'qwen/qwen3.7-max': {
		id: 'qwen/qwen3.7-max',
		name: 'Qwen: Qwen3.7 Max',
		api: 'openai-completions',
		provider: 'openrouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		reasoning: true,
		input: ['text'],
		cost: {
			input: 2.5,
			output: 7.5,
			cacheRead: 0,
			cacheWrite: 3.125,
		},
		contextWindow: 1_000_000,
		maxTokens: 65_536,
	},
} as const satisfies Record<string, Model<'openai-completions'>>;

export function getOpenRouterModelOverride(
	modelId: string,
): Model<'openai-completions'> | undefined {
	return OPENROUTER_MODEL_OVERRIDES[
		modelId as keyof typeof OPENROUTER_MODEL_OVERRIDES
	];
}
