import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import type { Api, Model } from '@earendil-works/pi-ai';

const grok = getBuiltinModel('opencode-go', 'grok-4.7');
const deepSeekFlash = getBuiltinModel('opencode-go', 'deepseek-v4.1-flash');

// Pi 1.5.2 omits these reviewed IDs. Reuse its transport, compatibility and
// reasoning metadata for the same provider/API family. Preserve the older
// Grok version's reviewed prices and limits rather than copying 4.7's tiers.
// Context sizes remain catalog estimates; endpoint/account limits may differ.
// https://opencode.ai/docs/go/
// https://models.dev/api.json
const OPENCODE_GO_MODEL_OVERRIDES = {
	'grok-4.6': {
		...grok,
		id: 'grok-4.6',
		name: 'Grok 4.6',
		cost: { input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0 },
		contextWindow: 500_000,
		maxTokens: 500_000,
	},
	'deepseek-flash': {
		...deepSeekFlash,
		id: 'deepseek-flash',
	},
	'deepseek-v4-flash-vision-exp': {
		...deepSeekFlash,
		id: 'deepseek-v4-flash-vision-exp',
		name: 'DeepSeek V4 Flash Vision Exp',
	},
} satisfies Record<string, Model<Api>>;

export function getOpenCodeGoModelOverride(
	modelId: string,
): Model<Api> | undefined {
	if (!Object.hasOwn(OPENCODE_GO_MODEL_OVERRIDES, modelId)) return undefined;
	return OPENCODE_GO_MODEL_OVERRIDES[
		modelId as keyof typeof OPENCODE_GO_MODEL_OVERRIDES
	];
}
