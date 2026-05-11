import { describe, expect, it } from 'vitest';
import {
	OPENROUTER_APP_TITLE,
	OPENROUTER_APP_URL,
} from '../base/pi/model/headers.js';
import { resolveModel } from '../base/pi/model/resolve.js';
import { StopCode } from '../types/stop-code.js';

const OPENROUTER_UPSTREAM_MODEL_CASES = [
	{
		id: 'deepseek/deepseek-v4-flash',
		contextWindow: 1_048_576,
	},
	{
		id: 'deepseek/deepseek-v4-pro',
		contextWindow: 1_048_576,
	},
	{
		id: 'moonshotai/kimi-k2.6',
		contextWindow: 262_144,
	},
	{
		id: 'qwen/qwen3.6-plus',
		contextWindow: 1_000_000,
	},
	{
		id: 'xiaomi/mimo-v2.5-pro',
		contextWindow: 1_048_576,
	},
] as const;

describe('resolveModel', () => {
	it('resolves the OpenAI Codex gpt-5.5 model from pi-ai', () => {
		const result = resolveModel({
			provider: 'openai-codex',
			model: 'gpt-5.5',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-5.5',
			api: 'openai-codex-responses',
			reasoning: true,
			thinkingLevelMap: { xhigh: 'xhigh' },
			contextWindow: 272_000,
			maxTokens: 128_000,
			cost: {
				input: 5,
				output: 30,
				cacheRead: 0.5,
				cacheWrite: 0,
			},
		});
	});

	it('resolves the OpenAI Codex gpt-5.4-mini model from pi-ai', () => {
		const result = resolveModel({
			provider: 'openai-codex',
			model: 'gpt-5.4-mini',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model).toMatchObject({
			provider: 'openai-codex',
			id: 'gpt-5.4-mini',
			api: 'openai-codex-responses',
			reasoning: true,
			contextWindow: 272_000,
			maxTokens: 128_000,
			cost: {
				input: 0.75,
				output: 4.5,
				cacheRead: 0.075,
				cacheWrite: 0,
			},
		});
	});

	for (const model of ['gpt-5.3-codex', 'gpt-5.3-codex-spark']) {
		it(`rejects OpenAI Codex model outside the OAuth allowlist: ${model}`, () => {
			const result = resolveModel({
				provider: 'openai-codex',
				model,
			});

			expect(result.ok).toBe(false);
			expect(!result.ok && result.turnEnd.stopCode).toBe(
				StopCode.ModelNotFound,
			);
		});
	}

	it('returns the configured model for the configured provider', () => {
		const result = resolveModel({
			provider: 'openrouter',
			model: 'openrouter/free',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model).toMatchObject({
			provider: 'openrouter',
			id: 'openrouter/free',
		});
	});

	it('adds hardcoded OpenRouter attribution headers for OpenRouter models', () => {
		const result = resolveModel({
			provider: 'openrouter',
			model: 'openrouter/free',
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.model.headers).toMatchObject({
			'HTTP-Referer': OPENROUTER_APP_URL,
			'X-OpenRouter-Title': OPENROUTER_APP_TITLE,
		});
	});

	for (const { id, contextWindow } of OPENROUTER_UPSTREAM_MODEL_CASES) {
		it(`resolves the OpenRouter ${id} model from pi-ai`, () => {
			const result = resolveModel({
				provider: 'openrouter',
				model: id,
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'openrouter',
				id,
				api: 'openai-completions',
				reasoning: true,
				contextWindow,
			});
		});
	}

	it('returns ProviderNotSpecified when provider is omitted', () => {
		const result = resolveModel({ model: 'openrouter/free' });
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.ProviderNotSpecified,
		);
	});

	it('returns ModelNotSpecified when model is omitted', () => {
		const result = resolveModel({ provider: 'openrouter' });
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.ModelNotSpecified,
		);
	});

	it('returns ProviderNotSpecified when config has no provider', () => {
		const result = resolveModel({});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.ProviderNotSpecified,
		);
	});

	it('returns ProviderNotFound for an unknown provider', () => {
		const result = resolveModel({ provider: 'not-a-provider' });
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(
			StopCode.ProviderNotFound,
		);
	});

	it('returns ModelNotFound for an unknown model on a known provider', () => {
		const result = resolveModel({
			provider: 'openrouter',
			model: 'missing-model',
		});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.turnEnd.stopCode).toBe(StopCode.ModelNotFound);
	});
});
