import type { Model } from '@earendil-works/pi-ai';

const OPENAI_CODEX_MODEL_OVERRIDES = {} as const satisfies Record<
	string,
	Model<'openai-codex-responses'>
>;

export function getOpenAICodexModelOverride(
	modelId: string,
): Model<'openai-codex-responses'> | undefined {
	return OPENAI_CODEX_MODEL_OVERRIDES[
		modelId as keyof typeof OPENAI_CODEX_MODEL_OVERRIDES
	];
}
