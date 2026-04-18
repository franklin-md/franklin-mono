import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_SETTINGS, appSettingsCodec } from '../settings/schema.js';

/**
 * Schema-level tests for app settings.
 *
 * Exercised through the codec so the internal zod schema stays private.
 * Goal: verify minor-evolution friendliness — missing fields get defaults,
 * unknown fields drop silently, only real type errors surface as issues.
 */
describe('AppSettings schema', () => {
	it('DEFAULT_APP_SETTINGS pins the expected shape (regression lock)', () => {
		expect(DEFAULT_APP_SETTINGS).toEqual({
			defaultLLMConfig: {
				provider: 'openai-codex',
				model: 'gpt-5.4',
				reasoning: 'medium',
			},
		});
	});

	it('empty persisted data hydrates to DEFAULT_APP_SETTINGS', () => {
		const result = appSettingsCodec.decode({ version: 1, data: {} });
		expect(result).toEqual({ ok: true, value: DEFAULT_APP_SETTINGS });
	});

	it('partial data: custom provider preserved, other fields defaulted', () => {
		const result = appSettingsCodec.decode({
			version: 1,
			data: { defaultLLMConfig: { provider: 'anthropic' } },
		});
		expect(result).toMatchObject({
			ok: true,
			value: {
				defaultLLMConfig: {
					provider: 'anthropic',
					model: 'gpt-5.4',
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
				defaultLLMConfig: {
					provider: 'openai',
					model: 'gpt-5.4',
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
				defaultLLMConfig: {
					provider: 'openai',
					model: 'gpt-5.4',
					reasoning: 'medium',
				},
			},
		});
	});

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
