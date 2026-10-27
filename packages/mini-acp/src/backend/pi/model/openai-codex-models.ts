const OPENAI_CODEX_MODEL_IDS = new Set([
	'gpt-6-astra',
	'gpt-6.1-sol',
	'gpt-5.6-terra',
	'gpt-5.6-luna',
	'gpt-5.5',
	'gpt-5.4',
	'gpt-5.4-mini',
]);

export function isOpenAICodexModelId(modelId: string): boolean {
	return OPENAI_CODEX_MODEL_IDS.has(modelId);
}
