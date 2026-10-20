import { describe, expect, it } from 'vitest';
import {
	OPENROUTER_APP_TITLE,
	OPENROUTER_APP_URL,
} from '../backend/pi/model/headers.js';
import { resolveModel } from '../backend/pi/model/resolve.js';
import { StopCode } from '../types/stop-code.js';

const OPENROUTER_UPSTREAM_MODEL_CASES = [
	{ id: 'z-ai/glm-5.1', contextWindow: 202_800 },
	{ id: 'deepseek/deepseek-v4-flash', contextWindow: 1_048_576 },
	{ id: 'deepseek/deepseek-v4-pro', contextWindow: 1_048_576 },
	{ id: 'moonshotai/kimi-k2.6', contextWindow: 262_144 },
	{ id: 'x-ai/grok-4.20', contextWindow: 2_000_000 },
	{ id: 'qwen/qwen3.6-plus', contextWindow: 1_000_000 },
	{ id: 'xiaomi/mimo-v2.5-pro', contextWindow: 1_048_576 },
] as const;

const OPENAI_CODEX_LOCAL_OVERRIDE_MODEL_CASES = [
	{
		id: 'gpt-6-astra',
		name: 'GPT-6-Astra',
		thinkingLevelMap: { off: null, minimal: 'low', xhigh: 'xhigh' },
		contextWindow: 272_000,
		maxTokens: 128_000,
		cost: {
			input: 10,
			output: 50,
			cacheRead: 1,
			cacheWrite: 12.5,
		},
	},
	{
		id: 'gpt-6.1-sol',
		name: 'GPT-6.1-Sol',
		thinkingLevelMap: { off: null, minimal: 'low', xhigh: 'xhigh' },
		contextWindow: 272_000,
		maxTokens: 128_000,
		cost: {
			input: 2,
			output: 10,
			cacheRead: 0.1,
			cacheWrite: 2.5,
		},
	},
	{
		id: 'gpt-5.6-terra',
		name: 'GPT-5.6 Terra',
		thinkingLevelMap: { minimal: 'low', xhigh: 'xhigh' },
		contextWindow: 372_000,
		maxTokens: 128_000,
		cost: {
			input: 2.5,
			output: 15,
			cacheRead: 0.25,
			cacheWrite: 3.125,
		},
	},
	{
		id: 'gpt-5.6-luna',
		name: 'GPT-5.6 Luna',
		thinkingLevelMap: { minimal: 'low', xhigh: 'xhigh' },
		contextWindow: 372_000,
		maxTokens: 128_000,
		cost: {
			input: 1,
			output: 6,
			cacheRead: 0.1,
			cacheWrite: 1.25,
		},
	},
] as const;

const OPENROUTER_LOCAL_OVERRIDE_MODEL_CASES = [
	{
		id: 'x-ai/grok-4.5',
		name: 'xAI: Grok 4.5',
		input: ['text', 'image'],
		thinkingLevelMap: { off: null, minimal: 'low' },
		contextWindow: 500_000,
		maxTokens: 4_096,
		cost: {
			input: 2,
			output: 6,
			cacheRead: 0.5,
			cacheWrite: 0,
		},
	},
	{
		id: 'google/gemini-3.5-flash',
		name: 'Google: Gemini 3.5 Flash',
		input: ['text', 'image'],
		contextWindow: 1_048_576,
		maxTokens: 65_536,
		cost: {
			input: 1.5,
			output: 9,
			cacheRead: 0.15,
			cacheWrite: 0.08333333333333334,
		},
	},
	{
		id: 'qwen/qwen3.7-max',
		name: 'Qwen: Qwen3.7 Max',
		input: ['text'],
		contextWindow: 1_000_000,
		maxTokens: 65_536,
		cost: {
			input: 2.5,
			output: 7.5,
			cacheRead: 0,
			cacheWrite: 3.125,
		},
	},
] as const;

const OPENCODE_GO_MODEL_CASES = [
	{
		id: 'grok-4.6',
		name: 'Grok 4.6',
		api: 'openai-responses',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 500_000,
		maxTokens: 500_000,
		cost: { input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0 },
	},
	{
		id: 'gpt-5.6-luna',
		name: 'GPT 5.6 Luna',
		api: 'openai-responses',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_050_000,
		maxTokens: 128_000,
		cost: {
			input: 0.2,
			output: 1.2,
			cacheRead: 0.02,
			cacheWrite: 0.25,
		},
	},
	{
		id: 'glm-5.3',
		name: 'GLM-5.3',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text'],
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		cost: { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0 },
	},
	{
		id: 'glm-5.3-flash',
		name: 'GLM-5.3-Flash',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		cost: { input: 0.15, output: 0.5, cacheRead: 0.03, cacheWrite: 0 },
	},
	{
		id: 'kimi-k3',
		name: 'Kimi K3',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_048_576,
		maxTokens: 131_072,
		cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
	},
	{
		id: 'kimi-k2.7-code',
		name: 'Kimi K2.7 Code',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 262_144,
		maxTokens: 262_144,
		cost: { input: 0.95, output: 4, cacheRead: 0.19, cacheWrite: 0 },
	},
	{
		id: 'longcat-2.0',
		name: 'LongCat-2.0',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text'],
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		cost: { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0 },
	},
	{
		id: 'mimo-v2.5',
		name: 'MiMo V2.5',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 128_000,
		cost: {
			input: 0.14,
			output: 0.28,
			cacheRead: 0.0028,
			cacheWrite: 0,
		},
	},
	{
		id: 'mimo-v2.5-pro',
		name: 'MiMo V2.5 Pro',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text'],
		contextWindow: 1_048_576,
		maxTokens: 128_000,
		cost: {
			input: 0.435,
			output: 0.87,
			cacheRead: 0.003625,
			cacheWrite: 0,
		},
	},
	{
		id: 'minimax-m3',
		name: 'MiniMax M3',
		api: 'anthropic-messages',
		baseUrl: 'https://opencode.ai/zen/go',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
	},
	{
		id: 'muse-spark-1.3-contributor',
		name: 'Muse Spark 1.3 Contributor',
		api: 'openai-responses',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_048_576,
		maxTokens: 131_072,
		cost: { input: 0.1, output: 0.2, cacheRead: 0.002, cacheWrite: 0 },
	},
	{
		id: 'qwen3.8-flash',
		name: 'Qwen3.8 Flash',
		api: 'anthropic-messages',
		baseUrl: 'https://opencode.ai/zen/go',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		cost: {
			input: 0.15,
			output: 0.47,
			cacheRead: 0.016,
			cacheWrite: 0.2,
		},
	},
	{
		id: 'qwen3.8-max',
		name: 'Qwen3.8 Max',
		api: 'anthropic-messages',
		baseUrl: 'https://opencode.ai/zen/go',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		cost: { input: 2, output: 6, cacheRead: 0.25, cacheWrite: 2.5 },
	},
	{
		id: 'deepseek-v4-pro',
		name: 'DeepSeek V4 Pro',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text'],
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		cost: { input: 0.66, output: 1.98, cacheRead: 0.022, cacheWrite: 0 },
	},
	{
		id: 'deepseek-flash',
		name: 'DeepSeek V4.1 Flash',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		cost: { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 },
	},
	{
		id: 'deepseek-v4-flash-vision-exp',
		name: 'DeepSeek V4 Flash Vision Exp',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text', 'image'],
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		cost: { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 },
	},
	{
		id: 'hy4-preview',
		name: 'Hy4 Preview',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		input: ['text'],
		contextWindow: 1_024_000,
		maxTokens: 64_000,
		cost: {
			input: 0.834,
			output: 2.501,
			cacheRead: 0.042,
			cacheWrite: 0,
		},
	},
] as const;

describe('resolveModel', () => {
	for (const model of OPENAI_CODEX_LOCAL_OVERRIDE_MODEL_CASES) {
		it(`resolves the OpenAI Codex ${model.id} model from local overrides`, () => {
			const result = resolveModel({
				provider: 'openai-codex',
				model: model.id,
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'openai-codex',
				id: model.id,
				name: model.name,
				api: 'openai-codex-responses',
				baseUrl: 'https://chatgpt.com/backend-api',
				reasoning: true,
				thinkingLevelMap: model.thinkingLevelMap,
				input: ['text', 'image'],
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
				cost: model.cost,
			});
		});
	}

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

	for (const model of [
		'gpt-6-sol',
		'gpt-5.6-sol',
		'gpt-5.3-codex',
		'gpt-5.3-codex-spark',
	]) {
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

	for (const model of OPENROUTER_LOCAL_OVERRIDE_MODEL_CASES) {
		it(`resolves the OpenRouter ${model.id} model from local overrides`, () => {
			const result = resolveModel({
				provider: 'openrouter',
				model: model.id,
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'openrouter',
				id: model.id,
				name: model.name,
				api: 'openai-completions',
				baseUrl: 'https://openrouter.ai/api/v1',
				reasoning: true,
				...('thinkingLevelMap' in model
					? { thinkingLevelMap: model.thinkingLevelMap }
					: {}),
				input: model.input,
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
				cost: model.cost,
			});
		});
	}

	for (const model of OPENCODE_GO_MODEL_CASES) {
		it(`resolves the curated OpenCode Go ${model.id} model`, () => {
			const result = resolveModel({
				provider: 'opencode-go',
				model: model.id,
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'opencode-go',
				id: model.id,
				name: model.name,
				api: model.api,
				baseUrl: model.baseUrl,
				reasoning: true,
				input: model.input,
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
				cost: model.cost,
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
