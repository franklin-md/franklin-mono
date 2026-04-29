const OPENAI_CODEX_MODEL_IDS = new Set(['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini']);

export function isOpenAICodexModelId(modelId: string): boolean {
	return OPENAI_CODEX_MODEL_IDS.has(modelId);
}
