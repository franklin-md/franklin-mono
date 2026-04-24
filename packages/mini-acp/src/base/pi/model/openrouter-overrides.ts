import type { Model } from '@mariozechner/pi-ai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function openRouterModel(
	id: string,
	name: string,
	opts: {
		reasoning?: boolean;
		input: Model<'openai-completions'>['input'];
		cost: Model<'openai-completions'>['cost'];
		contextWindow: number;
		maxTokens: number;
	},
): Model<'openai-completions'> {
	return {
		id,
		name,
		api: 'openai-completions',
		provider: 'openrouter',
		baseUrl: OPENROUTER_BASE_URL,
		reasoning: opts.reasoning ?? false,
		input: opts.input,
		cost: opts.cost,
		contextWindow: opts.contextWindow,
		maxTokens: opts.maxTokens,
	};
}

const OPENROUTER_MODEL_OVERRIDES = {
	'deepseek/deepseek-v4-flash': openRouterModel(
		'deepseek/deepseek-v4-flash',
		'DeepSeek V4 Flash',
		{
			reasoning: true,
			input: ['text'],
			cost: {
				input: 0.14,
				output: 0.28,
				cacheRead: 0.028,
				cacheWrite: 0,
			},
			contextWindow: 1_048_576,
			maxTokens: 384_000,
		},
	),
	'deepseek/deepseek-v4-pro': openRouterModel(
		'deepseek/deepseek-v4-pro',
		'DeepSeek V4 Pro',
		{
			reasoning: true,
			input: ['text'],
			cost: {
				input: 1.74,
				output: 3.48,
				cacheRead: 0.174,
				cacheWrite: 1.74,
			},
			contextWindow: 1_048_576,
			maxTokens: 65_536,
		},
	),
	'moonshotai/kimi-k2.6': openRouterModel('moonshotai/kimi-k2.6', 'Kimi K2.6', {
		reasoning: true,
		input: ['text', 'image'],
		cost: {
			input: 0.7448,
			output: 4.655,
			cacheRead: 0,
			cacheWrite: 0,
		},
		contextWindow: 256_000,
		maxTokens: 65_536,
	}),
	'qwen/qwen3.6-plus': openRouterModel('qwen/qwen3.6-plus', 'Qwen3.6 Plus', {
		reasoning: true,
		cost: {
			input: 0.325,
			output: 1.95,
			cacheRead: 0.0325,
			cacheWrite: 0.40625,
		},
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 65_536,
	}),
	'xiaomi/mimo-v2.5-pro': openRouterModel(
		'xiaomi/mimo-v2.5-pro',
		'MiMo-V2.5-Pro',
		{
			reasoning: true,
			input: ['text'],
			cost: {
				input: 1,
				output: 3,
				cacheRead: 0.2,
				cacheWrite: 0,
			},
			contextWindow: 1_048_576,
			maxTokens: 131_072,
		},
	),
} as const;

export function getOpenRouterModelOverride(
	modelId: string,
): Model<'openai-completions'> | undefined {
	return OPENROUTER_MODEL_OVERRIDES[
		modelId as keyof typeof OPENROUTER_MODEL_OVERRIDES
	];
}
