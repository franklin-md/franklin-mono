import { describe, expect, it } from 'vitest';

import { MODEL_CATALOG } from '../../../../src/conversation/input/models/catalog.js';

describe('MODEL_CATALOG', () => {
	it('surfaces only Codex and OpenRouter in the selector catalog', () => {
		expect(MODEL_CATALOG.map((group) => group.provider)).toEqual([
			'openai-codex',
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
			contextWindow: 1_050_000,
			costInput: 5,
			costOutput: 30,
			intelligence: 'frontier',
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
});
