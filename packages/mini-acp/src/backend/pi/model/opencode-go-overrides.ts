import type { Model } from '@earendil-works/pi-ai';

type OpenCodeGoApi =
	| 'anthropic-messages'
	| 'openai-completions'
	| 'openai-responses';
type OpenCodeGoModel = Model<OpenCodeGoApi>;
type OpenCodeGoModelDefinition = Omit<
	OpenCodeGoModel,
	'baseUrl' | 'compat' | 'provider' | 'reasoning'
> & {
	compat?: NonNullable<OpenCodeGoModel['compat']>;
};

function openCodeGoBaseUrl(api: OpenCodeGoApi): string {
	switch (api) {
		case 'anthropic-messages':
			return 'https://opencode.ai/zen/go';
		case 'openai-completions':
		case 'openai-responses':
			return 'https://opencode.ai/zen/go/v1';
	}
}

function openCodeGoCompatibility(
	api: OpenCodeGoApi,
): NonNullable<OpenCodeGoModel['compat']> {
	switch (api) {
		case 'anthropic-messages':
			return { sendSessionAffinityHeaders: true };
		case 'openai-completions':
			return {
				supportsStore: false,
				supportsDeveloperRole: false,
				maxTokensField: 'max_tokens',
				sendSessionAffinityHeaders: true,
			};
		case 'openai-responses':
			return { sendSessionIdHeader: true };
	}
}

function openCodeGoModel({
	compat,
	...model
}: OpenCodeGoModelDefinition): OpenCodeGoModel {
	return {
		...model,
		provider: 'opencode-go',
		baseUrl: openCodeGoBaseUrl(model.api),
		reasoning: true,
		compat: { ...openCodeGoCompatibility(model.api), ...compat },
	};
}

// OpenCode Go's catalog moves faster than the pinned pi-ai release. Keep the
// curated, non-superseded selector set here so resolution metadata and the UI
// remain aligned without taking an unrelated pi-ai compatibility migration.
// Prices are the documented base tier; DeepSeek prices are the off-peak tier.
// Sources:
// - https://dev.opencode.ai/docs/go/
// - https://models.dev/api.json
const OPENCODE_GO_MODEL_OVERRIDES = {
	'grok-4.6': openCodeGoModel({
		id: 'grok-4.6',
		name: 'Grok 4.6',
		api: 'openai-responses',
		thinkingLevelMap: {
			off: null,
			minimal: 'low',
			low: 'low',
			medium: 'medium',
			high: 'high',
			xhigh: 'xhigh',
		},
		input: ['text', 'image'],
		cost: { input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0 },
		contextWindow: 500_000,
		maxTokens: 500_000,
	}),
	'gpt-5.6-luna': openCodeGoModel({
		id: 'gpt-5.6-luna',
		name: 'GPT 5.6 Luna',
		api: 'openai-responses',
		thinkingLevelMap: {
			off: null,
			minimal: 'low',
			low: 'low',
			medium: 'medium',
			high: 'high',
			xhigh: 'xhigh',
		},
		input: ['text', 'image'],
		cost: {
			input: 0.2,
			output: 1.2,
			cacheRead: 0.02,
			cacheWrite: 0.25,
		},
		contextWindow: 1_050_000,
		maxTokens: 128_000,
	}),
	'glm-5.3': openCodeGoModel({
		id: 'glm-5.3',
		name: 'GLM-5.3',
		api: 'openai-completions',
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: 'low',
			medium: null,
			high: 'high',
			xhigh: 'max',
		},
		input: ['text'],
		cost: { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 131_072,
	}),
	'glm-5.3-flash': openCodeGoModel({
		id: 'glm-5.3-flash',
		name: 'GLM-5.3-Flash',
		api: 'openai-completions',
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: 'low',
			medium: null,
			high: 'high',
			xhigh: 'max',
		},
		input: ['text', 'image'],
		cost: { input: 0.15, output: 0.5, cacheRead: 0.03, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 131_072,
	}),
	'kimi-k3': openCodeGoModel({
		id: 'kimi-k3',
		name: 'Kimi K3',
		api: 'openai-completions',
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: null,
			xhigh: 'max',
		},
		input: ['text', 'image'],
		cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
		contextWindow: 1_048_576,
		maxTokens: 131_072,
	}),
	'kimi-k2.7-code': openCodeGoModel({
		id: 'kimi-k2.7-code',
		name: 'Kimi K2.7 Code',
		api: 'openai-completions',
		input: ['text', 'image'],
		cost: { input: 0.95, output: 4, cacheRead: 0.19, cacheWrite: 0 },
		contextWindow: 262_144,
		maxTokens: 262_144,
	}),
	'longcat-2.0': openCodeGoModel({
		id: 'longcat-2.0',
		name: 'LongCat-2.0',
		api: 'openai-completions',
		input: ['text'],
		cost: { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 131_072,
	}),
	'mimo-v2.5': openCodeGoModel({
		id: 'mimo-v2.5',
		name: 'MiMo V2.5',
		api: 'openai-completions',
		input: ['text', 'image'],
		cost: {
			input: 0.14,
			output: 0.28,
			cacheRead: 0.0028,
			cacheWrite: 0,
		},
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	}),
	'mimo-v2.5-pro': openCodeGoModel({
		id: 'mimo-v2.5-pro',
		name: 'MiMo V2.5 Pro',
		api: 'openai-completions',
		input: ['text'],
		cost: {
			input: 0.435,
			output: 0.87,
			cacheRead: 0.003625,
			cacheWrite: 0,
		},
		contextWindow: 1_048_576,
		maxTokens: 128_000,
	}),
	'minimax-m3': openCodeGoModel({
		id: 'minimax-m3',
		name: 'MiniMax M3',
		api: 'anthropic-messages',
		input: ['text', 'image'],
		cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 131_072,
	}),
	'muse-spark-1.3-contributor': openCodeGoModel({
		id: 'muse-spark-1.3-contributor',
		name: 'Muse Spark 1.3 Contributor',
		api: 'openai-responses',
		thinkingLevelMap: {
			off: null,
			minimal: 'minimal',
			low: 'low',
			medium: 'medium',
			high: 'high',
			xhigh: 'xhigh',
		},
		input: ['text', 'image'],
		cost: { input: 0.1, output: 0.2, cacheRead: 0.002, cacheWrite: 0 },
		contextWindow: 1_048_576,
		maxTokens: 131_072,
	}),
	'qwen3.8-flash': openCodeGoModel({
		id: 'qwen3.8-flash',
		name: 'Qwen3.8 Flash',
		api: 'anthropic-messages',
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: 'low',
			medium: 'medium',
			high: null,
			xhigh: 'xhigh',
		},
		input: ['text', 'image'],
		cost: {
			input: 0.15,
			output: 0.47,
			cacheRead: 0.016,
			cacheWrite: 0.2,
		},
		contextWindow: 1_000_000,
		maxTokens: 131_072,
	}),
	'qwen3.8-max': openCodeGoModel({
		id: 'qwen3.8-max',
		name: 'Qwen3.8 Max',
		api: 'anthropic-messages',
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: 'low',
			medium: 'medium',
			high: null,
			xhigh: 'xhigh',
		},
		input: ['text', 'image'],
		cost: { input: 2, output: 6, cacheRead: 0.25, cacheWrite: 2.5 },
		contextWindow: 1_000_000,
		maxTokens: 131_072,
	}),
	'deepseek-v4-pro': openCodeGoModel({
		id: 'deepseek-v4-pro',
		name: 'DeepSeek V4 Pro',
		api: 'openai-completions',
		compat: {
			requiresReasoningContentOnAssistantMessages: true,
			thinkingFormat: 'deepseek',
		},
		thinkingLevelMap: {
			minimal: null,
			low: null,
			medium: null,
			high: 'high',
			xhigh: 'max',
		},
		input: ['text'],
		cost: { input: 0.66, output: 1.98, cacheRead: 0.022, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 384_000,
	}),
	'deepseek-flash': openCodeGoModel({
		id: 'deepseek-flash',
		name: 'DeepSeek V4.1 Flash',
		api: 'openai-completions',
		compat: {
			requiresReasoningContentOnAssistantMessages: true,
			thinkingFormat: 'deepseek',
		},
		thinkingLevelMap: {
			minimal: null,
			low: 'low',
			medium: null,
			high: 'high',
			xhigh: 'max',
		},
		input: ['text', 'image'],
		cost: { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 384_000,
	}),
	'deepseek-v4-flash-vision-exp': openCodeGoModel({
		id: 'deepseek-v4-flash-vision-exp',
		name: 'DeepSeek V4 Flash Vision Exp',
		api: 'openai-completions',
		compat: {
			requiresReasoningContentOnAssistantMessages: true,
			thinkingFormat: 'deepseek',
		},
		thinkingLevelMap: {
			minimal: null,
			low: 'low',
			medium: null,
			high: 'high',
			xhigh: 'max',
		},
		input: ['text', 'image'],
		cost: { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 384_000,
	}),
	'hy4-preview': openCodeGoModel({
		id: 'hy4-preview',
		name: 'Hy4 Preview',
		api: 'openai-completions',
		thinkingLevelMap: {
			off: 'none',
			minimal: null,
			low: null,
			medium: null,
			high: 'high',
			xhigh: null,
		},
		input: ['text'],
		cost: {
			input: 0.834,
			output: 2.501,
			cacheRead: 0.042,
			cacheWrite: 0,
		},
		contextWindow: 1_024_000,
		maxTokens: 64_000,
	}),
} as const satisfies Record<string, OpenCodeGoModel>;

export function getOpenCodeGoModelOverride(
	modelId: string,
): OpenCodeGoModel | undefined {
	return OPENCODE_GO_MODEL_OVERRIDES[
		modelId as keyof typeof OPENCODE_GO_MODEL_OVERRIDES
	];
}
