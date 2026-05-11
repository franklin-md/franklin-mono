import type { Model } from '@earendil-works/pi-ai';

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
const OPENROUTER_MODEL_OVERRIDES = {} as const satisfies Record<
	string,
	Model<'openai-completions'>
>;

export function getOpenRouterModelOverride(
	modelId: string,
): Model<'openai-completions'> | undefined {
	return OPENROUTER_MODEL_OVERRIDES[
		modelId as keyof typeof OPENROUTER_MODEL_OVERRIDES
	];
}
