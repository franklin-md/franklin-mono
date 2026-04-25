import { describe, expect, it } from 'vitest';
import {
	OPENROUTER_APP_TITLE,
	OPENROUTER_APP_URL,
} from '../base/pi/model/headers.js';
import { resolveModel } from '../base/pi/model/resolve.js';
import { StopCode } from '../types/stop-code.js';

const OPENROUTER_OVERRIDE_CASES = [
	{
		id: 'deepseek/deepseek-v4-flash',
		contextWindow: 1_048_576,
		cost: {
			input: 0.14,
			output: 0.28,
			cacheRead: 0.028,
			cacheWrite: 0,
		},
	},
	{
		id: 'deepseek/deepseek-v4-pro',
		contextWindow: 1_048_576,
		cost: {
			input: 1.74,
			output: 3.48,
			cacheRead: 0.174,
			cacheWrite: 1.74,
		},
	},
	{
		id: 'moonshotai/kimi-k2.6',
		contextWindow: 256_000,
		cost: {
			input: 0.7448,
			output: 4.655,
		},
	},
	{
		id: 'qwen/qwen3.6-plus',
		contextWindow: 1_000_000,
		cost: {
			input: 0.325,
			output: 1.95,
			cacheRead: 0.0325,
			cacheWrite: 0.40625,
		},
	},
	{
		id: 'xiaomi/mimo-v2.5-pro',
		contextWindow: 1_048_576,
		cost: {
			input: 1,
			output: 3,
			cacheRead: 0.2,
			cacheWrite: 0,
		},
	},
] as const;

describe('resolveModel', () => {
	it('resolves the Franklin OpenAI Codex override for gpt-5.5', () => {
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
			contextWindow: 1_050_000,
			maxTokens: 128_000,
			cost: {
				input: 5,
				output: 30,
				cacheRead: 0.5,
				cacheWrite: 0,
			},
		});
	});

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

	for (const { id, contextWindow, cost } of OPENROUTER_OVERRIDE_CASES) {
		it(`resolves the Franklin OpenRouter override for ${id}`, () => {
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
				cost,
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
