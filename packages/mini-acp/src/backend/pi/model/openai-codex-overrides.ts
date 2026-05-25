import type { Model } from '@earendil-works/pi-ai';

// Keep this Franklin-local escape hatch even when empty: it lets us add or
// correct model metadata without waiting for a new pi-ai package release.
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
