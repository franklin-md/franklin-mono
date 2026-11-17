import { describe, expect, it } from 'vitest';
import { getModelContextWindow } from '../../../../index.js';

describe('getModelContextWindow', () => {
	it.each([
		{ provider: 'openai', model: 'gpt-4', window: 8192 },
		{ provider: 'openai-codex', model: 'gpt-6.2-astra', window: 272_000 },
		{ provider: 'openai-codex', model: 'gpt-6.2-sol', window: 500_000 },
		{ provider: 'opencode-go', model: 'glm-5.2', window: 1_000_000 },
		{ provider: 'opencode-go', model: 'grok-4.6', window: 500_000 },
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
