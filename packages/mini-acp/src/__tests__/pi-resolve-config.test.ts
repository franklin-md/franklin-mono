import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../base/pi/resolve-config.js';
import { StopCode } from '../types/stop-code.js';

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
