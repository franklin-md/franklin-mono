import type { Model } from '@mariozechner/pi-ai';

const OPENAI_CODEX_BASE_URL = 'https://chatgpt.com/backend-api';

const OPENAI_CODEX_MODEL_OVERRIDES = {
	'gpt-5.5': {
		id: 'gpt-5.5',
		name: 'GPT-5.5',
		api: 'openai-codex-responses',
		provider: 'openai-codex',
		baseUrl: OPENAI_CODEX_BASE_URL,
		reasoning: true,
		input: ['text', 'image'],
		cost: {
			input: 5,
			output: 30,
			cacheRead: 0.5,
			cacheWrite: 0,
		},
		contextWindow: 1_050_000,
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
