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

	it('surfaces GPT-5.5 as the leading OpenAI Codex model', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models[0]).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-5.5',
			name: 'GPT-5.5',
			reasoning: true,
			contextWindow: 272_000,
			costInput: 5,
			costOutput: 30,
		});
	});

	it('limits OpenAI Codex to the first three OAuth models', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models.map((model) => model.id)).toEqual([
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
			'deepseek-v4-pro',
			'deepseek-v4-flash',
			'mimo-v2.5-pro',
			'mimo-v2.5',
			'kimi-k2.6',
			'glm-5.1',
			'qwen3.6-plus',
			'qwen3.5-plus',
			'minimax-m2.7',
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
			costInput: 1.74,
			costOutput: 3.48,
		});
	});
});
