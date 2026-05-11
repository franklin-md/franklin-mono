import type { Model } from '@earendil-works/pi-ai';

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
