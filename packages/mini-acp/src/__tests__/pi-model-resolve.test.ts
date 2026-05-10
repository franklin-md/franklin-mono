import { describe, expect, it } from 'vitest';
import {
	OPENROUTER_APP_TITLE,
	OPENROUTER_APP_URL,
} from '../base/pi/model/headers.js';
import { resolveModel } from '../base/pi/model/resolve.js';
import { StopCode } from '../types/stop-code.js';

const OPENROUTER_OVERRIDE_CASES = [
	{
		id: 'z-ai/glm-5.1',
		contextWindow: 202_752,
		maxTokens: 65_535,
		cost: {
			input: 1.0499999999999998,
			output: 3.5,
			cacheRead: 0.5249999999999999,
			cacheWrite: 0,
		},
	},
	{
		id: 'deepseek/deepseek-v4-flash',
		contextWindow: 1_048_576,
		maxTokens: 384_000,
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
		maxTokens: 65_536,
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
		maxTokens: 65_536,
		cost: {
			input: 0.7448,
			output: 4.655,
		},
	},
	{
		id: 'x-ai/grok-4.20',
		contextWindow: 2_000_000,
		maxTokens: 4_096,
		cost: {
			input: 1.25,
			output: 2.5,
			cacheRead: 0.19999999999999998,
			cacheWrite: 0,
		},
	},
	{
		id: 'qwen/qwen3.6-plus',
		contextWindow: 1_000_000,
		maxTokens: 65_536,
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
		maxTokens: 131_072,
		cost: {
			input: 1,
			output: 3,
			cacheRead: 0.2,
			cacheWrite: 0,
		},
	},
] as const;

const OPENCODE_GO_OVERRIDE_CASES = [
	{
		id: 'deepseek-v4-pro',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		cost: {
			input: 1.74,
			output: 3.48,
			cacheRead: 0.0145,
			cacheWrite: 0,
		},
	},
	{
		id: 'deepseek-v4-flash',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		cost: {
			input: 0.14,
			output: 0.28,
			cacheRead: 0.0028,
			cacheWrite: 0,
		},
	},
	{
		id: 'mimo-v2.5-pro',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_048_576,
		maxTokens: 128_000,
		cost: {
			input: 1,
			output: 3,
			cacheRead: 0.2,
			cacheWrite: 0,
		},
	},
	{
		id: 'mimo-v2.5',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_000_000,
		maxTokens: 128_000,
		cost: {
			input: 0.4,
			output: 2,
			cacheRead: 0.08,
			cacheWrite: 0,
		},
	},
	{
		id: 'kimi-k2.6',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 262_144,
		maxTokens: 65_536,
		cost: {
			input: 0.95,
			output: 4,
			cacheRead: 0.16,
			cacheWrite: 0,
		},
	},
	{
		id: 'glm-5.1',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 202_752,
		maxTokens: 32_768,
		cost: {
			input: 1.4,
			output: 4.4,
			cacheRead: 0.26,
			cacheWrite: 0,
		},
	},
	{
		id: 'qwen3.6-plus',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 262_144,
		maxTokens: 65_536,
		cost: {
			input: 0.5,
			output: 3,
			cacheRead: 0.05,
			cacheWrite: 0.625,
		},
	},
	{
		id: 'qwen3.5-plus',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 262_144,
		maxTokens: 65_536,
		cost: {
			input: 0.2,
			output: 1.2,
			cacheRead: 0.02,
			cacheWrite: 0.25,
		},
	},
	{
		id: 'minimax-m2.7',
		api: 'anthropic-messages',
		baseUrl: 'https://opencode.ai/zen/go',
		contextWindow: 204_800,
		maxTokens: 131_072,
		cost: {
			input: 0.3,
			output: 1.2,
			cacheRead: 0.06,
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

	for (const {
		id,
		contextWindow,
		maxTokens,
		cost,
	} of OPENROUTER_OVERRIDE_CASES) {
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
				maxTokens,
				cost,
			});
		});
	}

	for (const {
		id,
		api,
		baseUrl,
		contextWindow,
		maxTokens,
		cost,
	} of OPENCODE_GO_OVERRIDE_CASES) {
		it(`resolves the OpenCode Go override for ${id}`, () => {
			const result = resolveModel({
				provider: 'opencode-go',
				model: id,
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'opencode-go',
				id,
				api,
				baseUrl,
				reasoning: true,
				contextWindow,
				maxTokens,
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
