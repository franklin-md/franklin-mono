import type { Model } from '@earendil-works/pi-ai';

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
const OPENCODE_GO_MODEL_OVERRIDES = {
	// GLM-5.2 is not yet in the bundled pi-ai opencode-go catalog (which tops
	// out at glm-5.1). Mirror the upstream glm-5.1 metadata until a pi-ai
	// release ships GLM-5.2 with its own published figures.
	// Source: https://opencode.ai/zen/go/v1
	'glm-5.2': {
		id: 'glm-5.2',
		name: 'GLM-5.2',
		api: 'openai-completions',
		provider: 'opencode-go',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		reasoning: true,
		input: ['text'],
		cost: {
			input: 1.4,
			output: 4.4,
			cacheRead: 0.26,
			cacheWrite: 0,
		},
		contextWindow: 202_752,
		maxTokens: 32_768,
	},
} as const satisfies Record<string, Model<'openai-completions'>>;

export function getOpenCodeGoModelOverride(
	modelId: string,
): Model<'openai-completions'> | undefined {
	return OPENCODE_GO_MODEL_OVERRIDES[
		modelId as keyof typeof OPENCODE_GO_MODEL_OVERRIDES
	];
}
