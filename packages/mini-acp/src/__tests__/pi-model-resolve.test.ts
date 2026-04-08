import { describe, expect, it } from 'vitest';
import {
	OPENROUTER_APP_TITLE,
	OPENROUTER_APP_URL,
} from '../base/pi/model/headers.js';
import { resolveModel } from '../base/pi/model/resolve.js';
import { StopCode } from '../types/stop-code.js';

describe('resolveModel', () => {
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

	it('returns ProviderNotSpecified when config is omitted', () => {
		const result = resolveModel(undefined);
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
