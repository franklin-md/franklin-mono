import type { KnownProvider, Model } from '@earendil-works/pi-ai';

import { getOpenAICodexModelOverride } from './openai-codex-overrides.js';
import { getOpenCodeGoModelOverride } from './opencode-go-overrides.js';
import { getOpenRouterModelOverride } from './openrouter-overrides.js';

type ModelOverrideResolver = (modelId: string) => Model<string> | undefined;

const MODEL_OVERRIDE_RESOLVERS: Partial<
	Record<KnownProvider, ModelOverrideResolver>
> = {
	'openai-codex': getOpenAICodexModelOverride,
	'opencode-go': getOpenCodeGoModelOverride,
	openrouter: getOpenRouterModelOverride,
};

export function getModelOverride(
	provider: KnownProvider,
	modelId: string,
): Model<string> | undefined {
	return MODEL_OVERRIDE_RESOLVERS[provider]?.(modelId);
}
