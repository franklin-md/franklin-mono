import type { Api, KnownProvider, Model } from '@earendil-works/pi-ai';

import { getOpenCodeGoModelOverride } from './opencode-go-overrides.js';
import { getOpenRouterModelOverride } from './openrouter-overrides.js';

type ModelOverrideResolver = (modelId: string) => Model<Api> | undefined;

const MODEL_OVERRIDE_RESOLVERS: Partial<
	Record<KnownProvider, ModelOverrideResolver>
> = {
	'opencode-go': getOpenCodeGoModelOverride,
	openrouter: getOpenRouterModelOverride,
};

export function getModelOverride(
	provider: KnownProvider,
	modelId: string,
): Model<Api> | undefined {
	return MODEL_OVERRIDE_RESOLVERS[provider]?.(modelId);
}
