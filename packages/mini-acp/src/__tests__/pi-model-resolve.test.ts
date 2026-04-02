import { describe, expect, it } from 'vitest';
import { resolveModel } from '../base/pi/model-resolve.js';

describe('resolveModel', () => {
	it('returns the configured model for the configured provider', () => {
		const model = resolveModel({
			provider: 'openrouter',
			model: 'openrouter/free',
		});

		expect(model).toMatchObject({
			provider: 'openrouter',
			id: 'openrouter/free',
		});
	});

	it('throws when provider is omitted', () => {
		expect(() => resolveModel({ model: 'openrouter/free' })).toThrow(
			'Missing provider in ctx.config',
		);
	});

	it('throws when model is omitted', () => {
		expect(() => resolveModel({ provider: 'openrouter' })).toThrow(
			'Missing model in ctx.config',
		);
	});

	it('throws when config is omitted', () => {
		expect(() => resolveModel(undefined)).toThrow(
			'Missing provider in ctx.config',
		);
	});

	it('throws for an unknown provider', () => {
		expect(() =>
			resolveModel({
				provider: 'not-a-provider',
			}),
		).toThrow('Unknown provider in ctx.config: not-a-provider');
	});

	it('throws for an unknown model on a known provider', () => {
		expect(() =>
			resolveModel({
				provider: 'openrouter',
				model: 'missing-model',
			}),
		).toThrow(
			"Unknown model 'missing-model' for provider 'openrouter' in ctx.config",
		);
	});
});
