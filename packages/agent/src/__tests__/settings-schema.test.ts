import { describe, expect, it } from 'vitest';
import { resolveModel } from '@franklin/mini-acp/models';

import { DEFAULT_APP_SETTINGS, appSettingsCodec } from '../settings/schema.js';

/**
 * Schema-level tests for app settings.
 *
 * Exercised through the codec so the internal zod schema stays private.
 * Goal: verify minor-evolution friendliness — missing fields get defaults,
 * unknown fields drop silently, only real type errors surface as issues.
 */
describe('AppSettings schema', () => {
	it('resolves the default model through the request catalog', () => {
		expect(resolveModel(DEFAULT_APP_SETTINGS.defaultLLMConfig).ok).toBe(true);
	});

	it('DEFAULT_APP_SETTINGS pins the expected shape (regression lock)', () => {
		expect(DEFAULT_APP_SETTINGS).toEqual({
			shareViewedReferencesByDefault: true,
			defaultLLMConfig: {
				provider: 'openai-codex',
				model: 'gpt-6.2-sol',
				reasoning: 'medium',
			},
		});
	});

	it('empty persisted data hydrates to DEFAULT_APP_SETTINGS', () => {
		const result = appSettingsCodec.decode({ version: 1, data: {} });
		expect(result).toEqual({ ok: true, value: DEFAULT_APP_SETTINGS });
	});

	it.each([
		['openai-codex', 'gpt-6.1-sol', 'gpt-6.2-sol'],
		['openai-codex', 'gpt-6-astra', 'gpt-6.2-astra'],
		['openai-codex', 'gpt-5.6-luna', 'gpt-5.6-luna'],
		['openai', 'gpt-6.1-sol', 'gpt-6.1-sol'],
	])('decodes the saved default %s/%s as %s', (provider, model, upgraded) => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: {
				shareViewedReferencesByDefault: false,
				defaultLLMConfig: { provider, model, reasoning: 'max' },
			},
		});
		expect(result).toEqual({
			ok: true,
			value: {
				shareViewedReferencesByDefault: false,
				defaultLLMConfig: { provider, model: upgraded, reasoning: 'max' },
			},
		});
	});

	it('reads the retired minimal reasoning level as low', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: {
				defaultLLMConfig: {
					provider: 'openai-codex',
					model: 'gpt-6.2-sol',
					reasoning: 'minimal',
				},
			},
		});
		expect(result.ok && result.value.defaultLLMConfig.reasoning).toBe('low');
	});

	it('partial data: custom provider preserved, other fields defaulted', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: { defaultLLMConfig: { provider: 'anthropic' } },
		});
		expect(result).toMatchObject({
			ok: true,
			value: {
				shareViewedReferencesByDefault: true,
				defaultLLMConfig: {
					provider: 'anthropic',
					model: 'gpt-6.1-sol',
					reasoning: 'medium',
				},
			},
		});
	});

	it('unknown top-level fields are dropped, not rejected', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: {
				defaultLLMConfig: { provider: 'openai' },
				legacyFlag: true,
			},
		});
		expect(result).toEqual({
			ok: true,
			value: {
				shareViewedReferencesByDefault: true,
				defaultLLMConfig: {
					provider: 'openai',
					model: 'gpt-6.1-sol',
					reasoning: 'medium',
				},
			},
		});
	});

	it('unknown nested fields are dropped, not rejected', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: {
				defaultLLMConfig: { provider: 'openai', oldInnerField: 42 },
			},
		});
		expect(result).toEqual({
			ok: true,
			value: {
				shareViewedReferencesByDefault: true,
				defaultLLMConfig: {
					provider: 'openai',
					model: 'gpt-6.1-sol',
					reasoning: 'medium',
				},
			},
		});
	});

	it.each(['xhigh', 'max'] as const)(
		'round-trips %s reasoning without rewriting it',
		(reasoning) => {
			const value = {
				...DEFAULT_APP_SETTINGS,
				defaultLLMConfig: {
					...DEFAULT_APP_SETTINGS.defaultLLMConfig,
					reasoning,
				},
			};
			expect(
				appSettingsCodec.decode(
					JSON.parse(JSON.stringify(appSettingsCodec.encode(value))),
				),
			).toEqual({ ok: true, value });
		},
	);

	it('real type mismatch still surfaces as schema-mismatch', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: { defaultLLMConfig: { reasoning: 'not-a-level' } },
		});
		expect(result).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch', version: 1 },
		});
	});

	it('wrong inner type (number where enum expected) surfaces as schema-mismatch', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: { defaultLLMConfig: { model: 123 } },
		});
		expect(result).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch', version: 1 },
		});
	});
});
