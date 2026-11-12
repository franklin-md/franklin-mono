import { describe, expect, it } from 'vitest';

import { MODEL_CATALOG } from '../../../../src/conversation/input/models/catalog.js';

describe('MODEL_CATALOG', () => {
	it('surfaces supported provider groups in the selector catalog', () => {
		expect(MODEL_CATALOG.map((group) => group.provider)).toEqual([
			'openai-codex',
			'opencode-go',
			'openrouter',
		]);
	});

	it('surfaces GPT-6-Astra as the leading OpenAI Codex model', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models[0]).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-6-astra',
			name: 'GPT-6-Astra',
			reasoning: true,
			contextWindow: 272_000,
			costInput: 10,
			costOutput: 50,
		});
	});

	it('surfaces GPT-6.1-Sol as the balanced OpenAI Codex model', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models[1]).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-6.1-sol',
			name: 'GPT-6.1-Sol',
			reasoning: true,
			contextWindow: 272_000,
			costInput: 2,
			costOutput: 10,
		});
	});

	it('limits OpenAI Codex to the curated OAuth models', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models.map((model) => model.id)).toEqual([
			'gpt-6-astra',
			'gpt-6.1-sol',
			'gpt-5.6-terra',
			'gpt-5.6-luna',
			'gpt-5.5',
			'gpt-5.4',
			'gpt-5.4-mini',
		]);
	});

	it('includes the curated OpenCode Go model list', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'opencode-go',
		);

		expect(group).toMatchObject({
			displayName: 'OpenCode Go',
			access: 'api',
		});
		expect(group?.models.map((model) => model.id)).toEqual([
			'grok-4.6',
			'gpt-5.6-luna',
			'glm-5.3',
			'glm-5.3-flash',
			'kimi-k3',
			'kimi-k2.7-code',
			'longcat-2.0',
			'mimo-v2.5',
			'mimo-v2.5-pro',
			'minimax-m3',
			'muse-spark-1.3-contributor',
			'qwen3.8-flash',
			'qwen3.8-max',
			'deepseek-v4-pro',
			'deepseek-flash',
			'deepseek-v4-flash-vision-exp',
			'hy4-preview',
		]);
		expect(
			group?.models.every((model) => model.provider === 'opencode-go'),
		).toBe(true);
	});

	it('keeps OpenCode Go model metadata aligned to the source catalog', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'opencode-go',
		);
		const deepSeekPro = group?.models.find(
			(model) => model.id === 'deepseek-v4-pro',
		);

		expect(deepSeekPro).toMatchObject({
			name: 'DeepSeek V4 Pro',
			reasoning: true,
			contextWindow: 1_000_000,
			costInput: 0.66,
			costOutput: 1.98,
		});
	});

	it('keeps Gemini Flash metadata aligned to the OpenRouter catalog', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'openrouter',
		);
		const geminiFlash = group?.models.find(
			(model) => model.id === 'google/gemini-3.5-flash',
		);

		expect(geminiFlash).toMatchObject({
			name: 'Gemini 3.5 Flash',
			reasoning: true,
			contextWindow: 1_048_576,
			costInput: 1.5,
			costOutput: 9,
		});
	});

	it('includes Qwen3.7 Max in the OpenRouter catalog', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'openrouter',
		);
		const qwenMax = group?.models.find(
			(model) => model.id === 'qwen/qwen3.7-max',
		);

		expect(qwenMax).toMatchObject({
			provider: 'openrouter',
			name: 'Qwen3.7 Max',
			reasoning: true,
			contextWindow: 1_000_000,
			costInput: 2.5,
			costOutput: 7.5,
		});
	});

	it('includes Grok 4.5 in the OpenRouter catalog', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'openrouter',
		);
		const grok = group?.models.find((model) => model.id === 'x-ai/grok-4.5');

		expect(grok).toMatchObject({
			provider: 'openrouter',
			name: 'Grok 4.5',
			reasoning: true,
			contextWindow: 500_000,
			costInput: 2,
			costOutput: 6,
		});
	});
});
