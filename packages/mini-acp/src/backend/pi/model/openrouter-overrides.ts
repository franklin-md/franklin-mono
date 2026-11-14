import type { Model } from '@earendil-works/pi-ai';

type OpenRouterModel = Model<'openai-completions'>;

function openRouterModel(
	definition: Omit<
		OpenRouterModel,
		'api' | 'provider' | 'baseUrl' | 'reasoning'
	>,
): OpenRouterModel {
	return {
		...definition,
		api: 'openai-completions',
		provider: 'openrouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		reasoning: true,
	};
}

// These models always think. Exclude unsupported levels so pi-ai clamps the
// caller's saved effort before serializing an OpenRouter request.
// https://openrouter.ai/anthropic/claude-fable-5.2
// https://openrouter.ai/anthropic/claude-opus-5.5
const CLAUDE_THINKING_LEVEL_MAP = {
	off: null,
	minimal: null,
	xhigh: 'max',
} as const;

// Argon, Carbon and Flash support low/medium/high; Hydrogen also supports xhigh.
// https://aistudio.google.com/docs/thinking#thinking-levels
const GEMINI_THINKING_LEVEL_MAP = { off: null, minimal: null } as const;

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
const OPENROUTER_MODEL_OVERRIDES = {
	// OpenRouter model API metadata (2026-11-13), including current promotional
	// Gemini prices. The selector resolves these same estimates directly.
	// https://openrouter.ai/api/v1/models
	'anthropic/claude-fable-5.2': openRouterModel({
		id: 'anthropic/claude-fable-5.2',
		name: 'Anthropic: Claude Fable 5.2',
		thinkingLevelMap: CLAUDE_THINKING_LEVEL_MAP,
		input: ['text', 'image'],
		cost: { input: 8, output: 40, cacheRead: 0.2, cacheWrite: 10 },
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	}),
	'anthropic/claude-opus-5.5': openRouterModel({
		id: 'anthropic/claude-opus-5.5',
		name: 'Anthropic: Claude Opus 5.5',
		thinkingLevelMap: CLAUDE_THINKING_LEVEL_MAP,
		input: ['text', 'image'],
		cost: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	}),
	'google/gemini-4-argon': openRouterModel({
		id: 'google/gemini-4-argon',
		name: 'Google: Gemini 4 Argon',
		thinkingLevelMap: GEMINI_THINKING_LEVEL_MAP,
		input: ['text', 'image'],
		cost: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 0.1875 },
		contextWindow: 1_048_576,
		maxTokens: 943_718,
	}),
	'google/gemini-4-carbon': openRouterModel({
		id: 'google/gemini-4-carbon',
		name: 'Google: Gemini 4 Carbon',
		thinkingLevelMap: GEMINI_THINKING_LEVEL_MAP,
		input: ['text', 'image'],
		cost: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 0.1875 },
		contextWindow: 1_048_576,
		maxTokens: 943_718,
	}),
	'google/gemini-4-hydrogen': openRouterModel({
		id: 'google/gemini-4-hydrogen',
		name: 'Google: Gemini 4 Hydrogen',
		thinkingLevelMap: { ...GEMINI_THINKING_LEVEL_MAP, xhigh: 'xhigh' },
		input: ['text', 'image'],
		cost: {
			input: 1.5,
			output: 7.5,
			cacheRead: 0.075,
			cacheWrite: 0.0833333333333333,
		},
		contextWindow: 1_048_576,
		maxTokens: 943_718,
	}),
	'google/gemini-3.8-flash': openRouterModel({
		id: 'google/gemini-3.8-flash',
		name: 'Google: Gemini 3.8 Flash',
		thinkingLevelMap: GEMINI_THINKING_LEVEL_MAP,
		input: ['text', 'image'],
		cost: {
			input: 0.825,
			output: 4.125,
			cacheRead: 0.0825,
			cacheWrite: 0.0416666666666667,
		},
		contextWindow: 1_048_576,
		maxTokens: 65_536,
	}),
	// OpenRouter model API metadata (2026-07-10):
	// https://openrouter.ai/api/v1/models
	'x-ai/grok-4.5': openRouterModel({
		id: 'x-ai/grok-4.5',
		name: 'xAI: Grok 4.5',
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
	}),
	// OpenRouter model API metadata (2026-05-23):
	// https://openrouter.ai/api/v1/models
	'google/gemini-3.5-flash': openRouterModel({
		id: 'google/gemini-3.5-flash',
		name: 'Google: Gemini 3.5 Flash',
		input: ['text', 'image'],
		cost: {
			input: 1.5,
			output: 9,
			cacheRead: 0.15,
			cacheWrite: 0.08333333333333334,
		},
		contextWindow: 1_048_576,
		maxTokens: 65_536,
	}),
	'qwen/qwen3.7-max': openRouterModel({
		id: 'qwen/qwen3.7-max',
		name: 'Qwen: Qwen3.7 Max',
		input: ['text'],
		cost: {
			input: 2.5,
			output: 7.5,
			cacheRead: 0,
			cacheWrite: 3.125,
		},
		contextWindow: 1_000_000,
		maxTokens: 65_536,
	}),
} as const satisfies Record<string, Model<'openai-completions'>>;

export function getOpenRouterModelOverride(
	modelId: string,
): Model<'openai-completions'> | undefined {
	return OPENROUTER_MODEL_OVERRIDES[
		modelId as keyof typeof OPENROUTER_MODEL_OVERRIDES
	];
}
