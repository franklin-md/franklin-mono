import { describe, it, expect, vi } from 'vitest';
import type { CoreRuntime } from '@franklin/extensions';
import { getLLMConfig } from '../settings/llm-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRuntime(
	llmConfig: {
		provider?: string;
		model?: string;
		reasoning?: string;
	} = {},
): CoreRuntime {
	return {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig,
			},
		})),
		setLLMConfig: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
		fork: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
		})),
		child: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
		})),
		dispose: vi.fn(async () => {}),
	} as unknown as CoreRuntime;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getLLMConfig', () => {
	it('returns the current llmConfig from runtime state', async () => {
		const runtime = mockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});

		const config = await getLLMConfig(runtime);

		expect(config).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});
	});

	it('returns empty object when no config is set', async () => {
		const runtime = mockRuntime();

		const config = await getLLMConfig(runtime);

		expect(config).toEqual({});
	});
});
