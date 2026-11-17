import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import type { Api, Model } from '@earendil-works/pi-ai';

// Pi 1.5.2 predates GPT-6.2. Reuse each predecessor's Codex transport and
// reasoning mapping. Context windows come from Codex's subscription catalog,
// and token cost estimates use OpenAI's published Standard API rates.
// https://learn.chatgpt.com/docs/models
// https://developers.openai.com/api/docs/models/gpt-6.2-astra
// https://developers.openai.com/api/docs/models/gpt-6.2-sol
const OPENAI_CODEX_MODEL_OVERRIDES = new Map<string, Model<Api>>([
	[
		'gpt-6.2-astra',
		{
			...getBuiltinModel('openai-codex', 'gpt-6-astra'),
			id: 'gpt-6.2-astra',
			name: 'GPT-6.2 Astra',
			contextWindow: 272_000,
			cost: {
				input: 8,
				output: 40,
				cacheRead: 0.4,
				cacheWrite: 10,
				tiers: [
					{
						inputTokensAbove: 272_000,
						input: 16,
						output: 60,
						cacheRead: 0.8,
						cacheWrite: 20,
					},
				],
			},
		},
	],
	[
		'gpt-6.2-sol',
		{
			...getBuiltinModel('openai-codex', 'gpt-6.1-sol'),
			id: 'gpt-6.2-sol',
			name: 'GPT-6.2 Sol',
			contextWindow: 500_000,
		},
	],
]);

export function getOpenAICodexModelOverride(
	modelId: string,
): Model<Api> | undefined {
	return OPENAI_CODEX_MODEL_OVERRIDES.get(modelId);
}
