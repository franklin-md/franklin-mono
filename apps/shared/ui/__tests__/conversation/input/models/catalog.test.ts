import { describe, expect, it, vi } from 'vitest';
import * as models from '@franklin/mini-acp/models';
import { DEFAULT_APP_SETTINGS } from '../../../../../../../packages/agent/src/settings/schema.js';

import { MODEL_CATALOG } from '../../../../src/conversation/input/models/catalog.js';

describe('MODEL_CATALOG', () => {
	it('keeps the default provider/model in the picker catalog used by Obsidian', () => {
		const config = DEFAULT_APP_SETTINGS.defaultLLMConfig;
		expect(MODEL_CATALOG.flatMap((group) => group.models)).toContainEqual(
			expect.objectContaining({ provider: config.provider, id: config.model }),
		);
	});

	it.each(MODEL_CATALOG.flatMap((group) => group.models))(
		'uses request metadata for $provider/$id',
		(entry) => {
			const resolved = models.resolveModel({
				provider: entry.provider,
				model: entry.id,
			});
			expect(resolved.ok).toBe(true);
			if (!resolved.ok) return;
			expect(entry).toMatchObject({
				reasoning: resolved.model.reasoning,
				contextWindow: resolved.model.contextWindow,
				costInput: resolved.model.cost.input,
				costOutput: resolved.model.cost.output,
			});
		},
	);

	it('keeps the remaining choices usable when a curated model disappears', async () => {
		vi.doMock('@franklin/mini-acp/models', () => ({
			resolveModel: (config: Parameters<typeof models.resolveModel>[0]) =>
				models.resolveModel(
					config.model === 'gpt-6.2-astra'
						? { ...config, model: 'missing-model' }
						: config,
				),
		}));
		vi.resetModules();
		try {
			const { MODEL_CATALOG: catalog } =
				await import('../../../../src/conversation/input/models/catalog.js');
			expect(catalog[0]?.models.map((entry) => entry.id)).toEqual(
				MODEL_CATALOG[0]?.models
					.filter((entry) => entry.id !== 'gpt-6.2-astra')
					.map((entry) => entry.id),
			);
			expect(catalog.slice(1)).toEqual(MODEL_CATALOG.slice(1));
		} finally {
			vi.doUnmock('@franklin/mini-acp/models');
			vi.resetModules();
		}
	});

	it('surfaces supported provider groups in the selector catalog', () => {
		expect(MODEL_CATALOG.map((group) => group.provider)).toEqual([
			'openai-codex',
			'opencode-go',
			'openrouter',
		]);
	});

	it('surfaces GPT-6.2-Astra as the leading OpenAI Codex model', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models[0]).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-6.2-astra',
			name: 'GPT-6.2-Astra',
			reasoning: true,
			contextWindow: 272_000,
			costInput: 8,
			costOutput: 40,
		});
	});

	it('surfaces GPT-6.2-Sol as the balanced OpenAI Codex model', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models[1]).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-6.2-sol',
			name: 'GPT-6.2-Sol',
			reasoning: true,
			contextWindow: 500_000,
			costInput: 2,
			costOutput: 10,
		});
	});

	it('limits OpenAI Codex to the curated OAuth models', () => {
		const openAICodex = MODEL_CATALOG.find(
			(group) => group.provider === 'openai-codex',
		);

		expect(openAICodex?.models.map((model) => model.id)).toEqual([
			'gpt-6.2-astra',
			'gpt-6.2-sol',
			'gpt-5.6-terra',
			'gpt-5.6-luna',
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

	it('keeps Gemini metadata aligned to the OpenRouter catalog', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'openrouter',
		);
		const geminiHydrogen = group?.models.find(
			(model) => model.id === 'google/gemini-4-hydrogen',
		);

		expect(geminiHydrogen).toMatchObject({
			name: 'Gemini 4 Hydrogen',
			reasoning: true,
			contextWindow: 1_048_576,
			costInput: 1.5,
			costOutput: 7.5,
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
			costInput: 1.475,
			costOutput: 4.425,
		});
	});

	it('includes Grok 4.7 in the OpenRouter catalog', () => {
		const group = MODEL_CATALOG.find(
			(providerGroup) => providerGroup.provider === 'openrouter',
		);
		const grok = group?.models.find((model) => model.id === 'x-ai/grok-4.7');

		expect(grok).toMatchObject({
			provider: 'openrouter',
			name: 'Grok 4.7',
			reasoning: true,
			contextWindow: 500_000,
			costInput: 2,
			costOutput: 6,
		});
	});
});
