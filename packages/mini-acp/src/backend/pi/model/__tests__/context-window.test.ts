import { describe, expect, it } from 'vitest';
import { getModelContextWindow } from '../../../../index.js';

describe('getModelContextWindow', () => {
	it.each([
		{ provider: 'openai', model: 'gpt-4', window: 8192 },
		{ provider: 'openai-codex', model: 'gpt-5.5', window: 272_000 },
		{ provider: 'openai-codex', model: 'gpt-5.6-sol', window: 372_000 },
		{ provider: 'opencode-go', model: 'glm-5.2', window: 202_752 },
		{ provider: 'openrouter', model: 'x-ai/grok-4.5', window: 500_000 },
	])(
		'resolves $provider/$model from the request catalog without auth',
		({ provider, model, window }) => {
			expect(getModelContextWindow({ provider, model })).toBe(window);
		},
	);

	it.each([
		{},
		{ provider: 'openai' },
		{ model: 'gpt-4' },
		{ provider: 'custom', model: 'gpt-4' },
		{ provider: 'openai', model: 'missing' },
		{ provider: 'openai-codex', model: 'gpt-5.3-codex' },
	])('leaves unresolved configs undefined: %j', (config) => {
		expect(getModelContextWindow(config)).toBeUndefined();
	});
});
