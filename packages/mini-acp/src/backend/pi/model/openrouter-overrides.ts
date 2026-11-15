import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import type { Api, Model } from '@earendil-works/pi-ai';

const geminiArgon = getBuiltinModel('openrouter', 'google/gemini-4-argon');

// Pi 1.5.2 omits Carbon and Hydrogen. They share Argon's API and compatibility;
// retain their reviewed OpenRouter metadata (2026-11-13). These catalog context
// sizes are estimates: effective endpoint/account limits can differ.
// https://openrouter.ai/api/v1/models
const OPENROUTER_MODEL_OVERRIDES = {
	'google/gemini-4-carbon': {
		...geminiArgon,
		id: 'google/gemini-4-carbon',
		name: 'Google: Gemini 4 Carbon',
	},
	'google/gemini-4-hydrogen': {
		...geminiArgon,
		id: 'google/gemini-4-hydrogen',
		name: 'Google: Gemini 4 Hydrogen',
		// Hydrogen also supports xhigh; Pi clamps max to that highest level.
		// https://aistudio.google.com/docs/thinking#thinking-levels
		thinkingLevelMap: { ...geminiArgon.thinkingLevelMap, xhigh: 'xhigh' },
		cost: {
			input: 1.5,
			output: 7.5,
			cacheRead: 0.075,
			cacheWrite: 0.0833333333333333,
		},
	},
} satisfies Record<string, Model<Api>>;

export function getOpenRouterModelOverride(
	modelId: string,
): Model<Api> | undefined {
	if (!Object.hasOwn(OPENROUTER_MODEL_OVERRIDES, modelId)) return undefined;
	return OPENROUTER_MODEL_OVERRIDES[
		modelId as keyof typeof OPENROUTER_MODEL_OVERRIDES
	];
}
