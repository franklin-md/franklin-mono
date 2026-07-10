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

const OPENROUTER_LOCAL_OVERRIDE_MODEL_CASES = [
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

// Keep OpenCode Go Qwen 3.5/3.6 and MiniMax M2.7 on the OpenAI-compatible
// path even though the OpenCode docs table lists provider SDKs such as
// @ai-sdk/alibaba and @ai-sdk/anthropic. Pi issue #4106 reproduced 404s with
// the non-/v1 metadata, PR #4110 fixed these models to openai-completions, and
// v0.73.0 release notes call out that generated metadata fix.
// Sources:
// - https://dev.opencode.ai/docs/go/
// - https://github.com/earendil-works/pi/issues/4106
// - https://github.com/earendil-works/pi/pull/4110
// - https://github.com/earendil-works/pi/releases/tag/v0.73.0
const OPENCODE_GO_UPSTREAM_MODEL_CASES = [
	{
		id: 'deepseek-v4-pro',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_000_000,
	},
	{
		id: 'deepseek-v4-flash',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_000_000,
	},
	{
		id: 'mimo-v2.5-pro',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_048_576,
	},
	{
		id: 'mimo-v2.5',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 1_000_000,
	},
	{
		id: 'kimi-k2.6',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 262_144,
	},
	{
		id: 'qwen3.6-plus',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 262_144,
	},
	{
		id: 'qwen3.5-plus',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 262_144,
	},
	{
		id: 'minimax-m2.7',
		api: 'openai-completions',
		baseUrl: 'https://opencode.ai/zen/go/v1',
		contextWindow: 204_800,
	},
] as const;

// GLM-5.2 is not yet in the bundled pi-ai opencode-go catalog, so it is served
// from the Franklin-local override escape hatch rather than upstream.
const OPENCODE_GO_LOCAL_OVERRIDE_MODEL_CASES = [
	{
		id: 'glm-5.2',
		name: 'GLM-5.2',
		input: ['text'],
		contextWindow: 202_752,
		maxTokens: 32_768,
		cost: {
			input: 1.4,
			output: 4.4,
			cacheRead: 0.26,
			cacheWrite: 0,
		},
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
				input: model.input,
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
				cost: model.cost,
			});
		});
	}

	for (const {
		id,
		api,
		baseUrl,
		contextWindow,
	} of OPENCODE_GO_UPSTREAM_MODEL_CASES) {
		it(`resolves the OpenCode Go ${id} model from pi-ai`, () => {
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
			});
		});
	}

	for (const model of OPENCODE_GO_LOCAL_OVERRIDE_MODEL_CASES) {
		it(`resolves the OpenCode Go ${model.id} model from local overrides`, () => {
			const result = resolveModel({
				provider: 'opencode-go',
				model: model.id,
			});

			expect(result.ok).toBe(true);
			expect(result.ok && result.model).toMatchObject({
				provider: 'opencode-go',
				id: model.id,
				name: model.name,
				api: 'openai-completions',
				baseUrl: 'https://opencode.ai/zen/go/v1',
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
