import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../base/pi/resolve-config.js';
import { StopCode } from '../types/stop-code.js';
import {
	OPENROUTER_APP_CATEGORY,
	OPENROUTER_APP_TITLE,
} from '../base/pi/model/headers.js';
import { OPENROUTER_APP_URL } from '../base/pi/model/headers.js';

const OPENROUTER_UPSTREAM_MODEL_CASES = [
	{ id: 'z-ai/glm-5.1', contextWindow: 202_752 },
	{ id: 'deepseek/deepseek-v4-flash', contextWindow: 1_048_576 },
	{ id: 'deepseek/deepseek-v4-pro', contextWindow: 1_048_576 },
	{ id: 'moonshotai/kimi-k2.6', contextWindow: 262_144 },
	{ id: 'x-ai/grok-4.20', contextWindow: 2_000_000 },
	{ id: 'qwen/qwen3.6-plus', contextWindow: 1_000_000 },
	{ id: 'xiaomi/mimo-v2.5-pro', contextWindow: 1_048_576 },
] as const;

const OPENROUTER_LOCAL_OVERRIDE_MODEL_CASES = [
	{
		id: 'google/gemini-3.5-flash',
		contextWindow: 1_048_576,
		maxTokens: 65_536,
	},
] as const;

describe('resolveConfig', () => {
	it('returns the model when config is fully valid', () => {
		const result = resolveConfig({
			provider: 'openrouter',
			model: 'openrouter/free',
			apiKey: 'sk-test-key',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model).toMatchObject({
			provider: 'openrouter',
			id: 'openrouter/free',
		});
	});

	it('adds hardcoded OpenRouter attribution headers on the resolved model', () => {
		const result = resolveConfig({
			provider: 'openrouter',
			model: 'openrouter/free',
			apiKey: 'sk-test-key',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model.headers).toMatchObject({
			'HTTP-Referer': OPENROUTER_APP_URL,
			'X-OpenRouter-Title': OPENROUTER_APP_TITLE,
			'X-OpenRouter-Categories': OPENROUTER_APP_CATEGORY.join(','),
		});
	});

	for (const { id, contextWindow } of OPENROUTER_UPSTREAM_MODEL_CASES) {
		it(`accepts the OpenRouter ${id} model from pi-ai when apiKey is present`, () => {
			const result = resolveConfig({
				provider: 'openrouter',
				model: id,
				apiKey: 'sk-test-key',
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'openrouter',
				id,
				api: 'openai-completions',
				contextWindow,
			});
		});
	}

	for (const model of OPENROUTER_LOCAL_OVERRIDE_MODEL_CASES) {
		it(`accepts the OpenRouter ${model.id} local override when apiKey is present`, () => {
			const result = resolveConfig({
				provider: 'openrouter',
				model: model.id,
				apiKey: 'sk-test-key',
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'openrouter',
				id: model.id,
				api: 'openai-completions',
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
			});
		});
	}

	it('accepts an OpenCode Go model from pi-ai when apiKey is present', () => {
		const result = resolveConfig({
			provider: 'opencode-go',
			model: 'deepseek-v4-pro',
			apiKey: 'sk-test-key',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model).toMatchObject({
			provider: 'opencode-go',
			id: 'deepseek-v4-pro',
			api: 'openai-completions',
			contextWindow: 1_000_000,
		});
	});

	it('returns AuthKeyNotSpecified when apiKey is omitted', () => {
		const result = resolveConfig({
			provider: 'openrouter',
			model: 'openrouter/free',
		});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.AuthKeyNotSpecified,
		);
	});

	it('returns AuthKeyNotSpecified when apiKey is empty string', () => {
		const result = resolveConfig({
			provider: 'openrouter',
			model: 'openrouter/free',
			apiKey: '',
		});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.AuthKeyNotSpecified,
		);
	});

	it('delegates to resolveModel for provider errors', () => {
		const result = resolveConfig({
			provider: 'not-a-provider',
			model: 'some-model',
			apiKey: 'sk-test-key',
		});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.ProviderNotFound,
		);
	});

	it('delegates to resolveModel for model errors', () => {
		const result = resolveConfig({
			provider: 'openrouter',
			model: 'missing-model',
			apiKey: 'sk-test-key',
		});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(StopCode.ModelNotFound);
	});
});
