import type { Model } from '@mariozechner/pi-ai';

// OpenCode Go models are split across API-compatible surfaces; pi-ai dispatches
// by `model.api`, so the helper determines both client and endpoint path.
const OPENCODE_GO_OPENAI_BASE_URL = 'https://opencode.ai/zen/go/v1';
const OPENCODE_GO_ANTHROPIC_BASE_URL = 'https://opencode.ai/zen/go';

type OpenCodeGoModel =
	| Model<'openai-completions'>
	| Model<'anthropic-messages'>;

function opencodeGoOpenAIModel(
	id: string,
	name: string,
	opts: {
		input: Model<'openai-completions'>['input'];
		cost: Model<'openai-completions'>['cost'];
		contextWindow: number;
		maxTokens: number;
		compat?: Model<'openai-completions'>['compat'];
	},
): Model<'openai-completions'> {
	return {
		id,
		name,
		api: 'openai-completions',
		provider: 'opencode-go',
		baseUrl: OPENCODE_GO_OPENAI_BASE_URL,
		reasoning: true,
		input: opts.input,
		cost: opts.cost,
		contextWindow: opts.contextWindow,
		maxTokens: opts.maxTokens,
		...(opts.compat ? { compat: opts.compat } : {}),
	};
}

function opencodeGoAnthropicModel(
	id: string,
	name: string,
	opts: {
		input: Model<'anthropic-messages'>['input'];
		cost: Model<'anthropic-messages'>['cost'];
		contextWindow: number;
		maxTokens: number;
	},
): Model<'anthropic-messages'> {
	return {
		id,
		name,
		api: 'anthropic-messages',
		provider: 'opencode-go',
		baseUrl: OPENCODE_GO_ANTHROPIC_BASE_URL,
		reasoning: true,
		input: opts.input,
		cost: opts.cost,
		contextWindow: opts.contextWindow,
		maxTokens: opts.maxTokens,
	};
}

const OPENCODE_GO_MODEL_OVERRIDES = {
	'deepseek-v4-pro': opencodeGoOpenAIModel(
		'deepseek-v4-pro',
		'DeepSeek V4 Pro',
		{
			input: ['text'],
			cost: {
				input: 1.74,
				output: 3.48,
				cacheRead: 0.0145,
				cacheWrite: 0,
			},
			contextWindow: 1_000_000,
			maxTokens: 384_000,
		},
	),
	'deepseek-v4-flash': opencodeGoOpenAIModel(
		'deepseek-v4-flash',
		'DeepSeek V4 Flash',
		{
			input: ['text'],
			cost: {
				input: 0.14,
				output: 0.28,
				cacheRead: 0.0028,
				cacheWrite: 0,
			},
			contextWindow: 1_000_000,
			maxTokens: 384_000,
		},
	),
	'mimo-v2.5-pro': opencodeGoOpenAIModel('mimo-v2.5-pro', 'MiMo V2.5 Pro', {
		input: ['text'],
		cost: {
			input: 1,
			output: 3,
			cacheRead: 0.2,
			cacheWrite: 0,
		},
		contextWindow: 1_048_576,
		maxTokens: 128_000,
	}),
	'mimo-v2.5': opencodeGoOpenAIModel('mimo-v2.5', 'MiMo V2.5', {
		input: ['text', 'image'],
		cost: {
			input: 0.4,
			output: 2,
			cacheRead: 0.08,
			cacheWrite: 0,
		},
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	}),
	'kimi-k2.6': opencodeGoOpenAIModel('kimi-k2.6', 'Kimi K2.6', {
		input: ['text', 'image'],
		cost: {
			input: 0.95,
			output: 4,
			cacheRead: 0.16,
			cacheWrite: 0,
		},
		contextWindow: 262_144,
		maxTokens: 65_536,
	}),
	'glm-5.1': opencodeGoOpenAIModel('glm-5.1', 'GLM-5.1', {
		input: ['text'],
		cost: {
			input: 1.4,
			output: 4.4,
			cacheRead: 0.26,
			cacheWrite: 0,
		},
		contextWindow: 202_752,
		maxTokens: 32_768,
	}),
	'qwen3.6-plus': opencodeGoOpenAIModel('qwen3.6-plus', 'Qwen3.6 Plus', {
		input: ['text', 'image'],
		cost: {
			input: 0.5,
			output: 3,
			cacheRead: 0.05,
			cacheWrite: 0.625,
		},
		contextWindow: 262_144,
		maxTokens: 65_536,
		compat: {
			thinkingFormat: 'qwen',
		},
	}),
	'qwen3.5-plus': opencodeGoOpenAIModel('qwen3.5-plus', 'Qwen3.5 Plus', {
		input: ['text', 'image'],
		cost: {
			input: 0.2,
			output: 1.2,
			cacheRead: 0.02,
			cacheWrite: 0.25,
		},
		contextWindow: 262_144,
		maxTokens: 65_536,
		compat: {
			thinkingFormat: 'qwen',
		},
	}),
	'minimax-m2.7': opencodeGoAnthropicModel('minimax-m2.7', 'MiniMax M2.7', {
		input: ['text'],
		cost: {
			input: 0.3,
			output: 1.2,
			cacheRead: 0.06,
			cacheWrite: 0,
		},
		contextWindow: 204_800,
		maxTokens: 131_072,
	}),
} as const;

export function getOpenCodeGoModelOverride(
	modelId: string,
): OpenCodeGoModel | undefined {
	return OPENCODE_GO_MODEL_OVERRIDES[
		modelId as keyof typeof OPENCODE_GO_MODEL_OVERRIDES
	];
}
