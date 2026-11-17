const OPENAI_CODEX_MODEL_IDS = new Set([
	'gpt-6.2-astra',
	'gpt-6.2-sol',
	// Retain these IDs for existing sessions that saved the original model.
	'gpt-6-astra',
	'gpt-6.1-sol',
	'gpt-5.6-terra',
	'gpt-5.6-luna',
]);

export function isOpenAICodexModelId(modelId: string): boolean {
	return OPENAI_CODEX_MODEL_IDS.has(modelId);
}
