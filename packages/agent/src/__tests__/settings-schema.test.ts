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
			documentDownloads: { idleTimeoutMs: 60_000, totalTimeoutMs: 900_000 },
			shareViewedReferencesByDefault: true,
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
				...DEFAULT_APP_SETTINGS,
				shareViewedReferencesByDefault: true,
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
				...DEFAULT_APP_SETTINGS,
				shareViewedReferencesByDefault: true,
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
				...DEFAULT_APP_SETTINGS,
				shareViewedReferencesByDefault: true,
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

	it('restores custom download limits and fills a missing duration', () => {
		expect(
			appSettingsCodec.decode({
				version: 1,
				data: { documentDownloads: { idleTimeoutMs: 120_000 } },
			}),
		).toMatchObject({
			ok: true,
			value: {
				documentDownloads: { idleTimeoutMs: 120_000, totalTimeoutMs: 900_000 },
			},
		});
	});

	it.each([0, -1, 1.5, 2_147_483_648])(
		'rejects invalid document timeout %s',
		(timeout) => {
			expect(
				appSettingsCodec.decode({
					version: 1,
					data: { documentDownloads: { idleTimeoutMs: timeout } },
				}).ok,
			).toBe(false);
		},
	);

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
