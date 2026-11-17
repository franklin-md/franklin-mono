import { describe, expect, it } from 'vitest';
import { getBuiltinModels } from '@earendil-works/pi-ai/providers/all';
import { clampThinkingLevel } from '@earendil-works/pi-ai';
import {
	OPENROUTER_APP_TITLE,
	OPENROUTER_APP_URL,
} from '../backend/pi/model/headers.js';
import { resolveModel } from '../backend/pi/model/resolve.js';
import { StopCode } from '../types/stop-code.js';

const OPENROUTER_UPSTREAM_MODEL_CASES = [
	{ id: 'z-ai/glm-5.1', contextWindow: 202_752 },
	{ id: 'deepseek/deepseek-v4-flash', contextWindow: 1_048_575 },
	{ id: 'deepseek/deepseek-v4-pro', contextWindow: 1_024_000 },
	{ id: 'moonshotai/kimi-k2.6', contextWindow: 262_144 },
	{ id: 'x-ai/grok-4.20', contextWindow: 2_000_000 },
	{ id: 'qwen/qwen3.6-plus', contextWindow: 1_000_000 },
	{ id: 'xiaomi/mimo-v2.5-pro', contextWindow: 262_144 },
] as const;

const UPSTREAM_MODEL_CASES = [
	['openai-codex', 'gpt-6-astra'],
	['openai-codex', 'gpt-6.1-sol'],
	['openai-codex', 'gpt-5.6-terra'],
	['openai-codex', 'gpt-5.6-luna'],
	['openrouter', 'anthropic/claude-fable-5.2'],
	['openrouter', 'anthropic/claude-opus-5.5'],
	['openrouter', 'google/gemini-4-argon'],
	['openrouter', 'google/gemini-3.8-flash'],
	['openrouter', 'x-ai/grok-4.5'],
	['openrouter', 'google/gemini-3.5-flash'],
	['openrouter', 'qwen/qwen3.7-max'],
	['opencode-go', 'gpt-5.6-luna'],
	['opencode-go', 'glm-5.3'],
	['opencode-go', 'glm-5.3-flash'],
	['opencode-go', 'kimi-k3'],
	['opencode-go', 'kimi-k2.7-code'],
	['opencode-go', 'longcat-2.0'],
	['opencode-go', 'mimo-v2.5'],
	['opencode-go', 'mimo-v2.5-pro'],
	['opencode-go', 'minimax-m3'],
	['opencode-go', 'muse-spark-1.3-contributor'],
	['opencode-go', 'qwen3.8-flash'],
	['opencode-go', 'qwen3.8-max'],
	['opencode-go', 'deepseek-v4-pro'],
	['opencode-go', 'hy4-preview'],
	['openrouter', 'z-ai/glm-5.3-prime'],
	['openrouter', 'deepseek/deepseek-v4.1-flash-1017'],
	['openrouter', 'deepseek/deepseek-v4-pro-0813'],
	['openrouter', 'x-ai/grok-4.7'],
] as const;

describe('resolveModel', () => {
	it.each(UPSTREAM_MODEL_CASES)(
		'preserves upstream metadata for %s/%s',
		(provider, id) => {
			const builtin = getBuiltinModels(provider).find(
				(model) => model.id === id,
			);
			const resolved = resolveModel({ provider, model: id });
			expect(builtin).toBeDefined();
			if (!resolved.ok) throw new Error('Model resolution failed');
			const { headers: _headers, ...model } = resolved.model;
			expect(model).toEqual(builtin);
		},
	);

	it.each([
		['z-ai/glm-5.3-prime', 'low', 'high', 'max'],
		['deepseek/deepseek-v4.1-flash-1017', 'off', 'high', 'max'],
		['deepseek/deepseek-v4-pro-0813', 'off', 'high', 'max'],
		['x-ai/grok-4.7', 'low', 'medium', 'xhigh'],
	] as const)(
		'resolves current OpenRouter model %s with supported effort',
		(id, lowest, medium, highest) => {
			const result = resolveModel({ provider: 'openrouter', model: id });
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.model.contextWindow).toBeGreaterThanOrEqual(500_000);
			expect(clampThinkingLevel(result.model, 'off')).toBe(lowest);
			expect(clampThinkingLevel(result.model, 'medium')).toBe(medium);
			const level = clampThinkingLevel(result.model, 'xhigh');
			expect(result.model.thinkingLevelMap?.[level] ?? level).toBe(highest);
		},
	);
	it.each([
		['anthropic/claude-fable-5.2', 'xhigh'],
		['anthropic/claude-opus-5.5', 'xhigh'],
		['google/gemini-4-argon', 'high'],
		['google/gemini-4-carbon', 'high'],
		['google/gemini-4-hydrogen', 'xhigh'],
		['google/gemini-3.8-flash', 'high'],
	])('clamps saved effort to supported levels for %s', (id, highestEffort) => {
		const result = resolveModel({ provider: 'openrouter', model: id });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const model = result.model;
		expect(clampThinkingLevel(model, 'off')).toBe('low');
		expect(clampThinkingLevel(model, 'minimal')).toBe('low');
		expect(clampThinkingLevel(model, 'medium')).toBe('medium');
		const highestLevel = clampThinkingLevel(model, 'xhigh');
		expect(model.thinkingLevelMap?.[highestLevel] ?? highestLevel).toBe(
			highestEffort,
		);
	});

	for (const model of [
		'gpt-5.5',
		'gpt-5.4',
		'gpt-5.4-mini',
		'gpt-6-sol',
		'gpt-5.6-sol',
		'gpt-5.3-codex',
		'gpt-5.3-codex-spark',
		'constructor',
		'toString',
		'__proto__',
	]) {
		it(`rejects OpenAI Codex model outside the reviewed OAuth set: ${model}`, () => {
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

	it.each([
		['openrouter', 'google/gemini-4-carbon', 'openai-completions'],
		['openrouter', 'google/gemini-4-hydrogen', 'openai-completions'],
		['opencode-go', 'grok-4.6', 'openai-responses'],
		['opencode-go', 'deepseek-flash', 'openai-completions'],
		['opencode-go', 'deepseek-v4-flash-vision-exp', 'openai-completions'],
	] as const)('keeps missing model %s/%s available', (provider, id, api) => {
		expect(getBuiltinModels(provider).some((model) => model.id === id)).toBe(
			false,
		);
		const result = resolveModel({ provider, model: id });
		expect(result.ok && result.model).toMatchObject({
			provider,
			id,
			api,
			reasoning: true,
		});
	});

	it.each(['openrouter', 'opencode-go'] as const)(
		'rejects prototype keys on %s',
		(provider) => {
			for (const model of ['constructor', 'toString', '__proto__']) {
				const result = resolveModel({ provider, model });
				expect(!result.ok && result.turnEnd.stopCode).toBe(
					StopCode.ModelNotFound,
				);
			}
		},
	);

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
