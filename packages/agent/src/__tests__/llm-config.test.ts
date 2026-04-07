import { describe, it, expect, vi } from 'vitest';
import type { CoreRuntime } from '@franklin/extensions';
import { getLLMConfig, setLLMConfig } from '../settings/llm-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRuntime(
	llmConfig: { provider?: string; model?: string; reasoning?: string } = {},
): CoreRuntime {
	return {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig,
			},
		})),
		setContext: vi.fn(async () => {}),
		initialize: vi.fn(async () => ({})),
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

describe('setLLMConfig', () => {
	it('calls setContext with the new config', async () => {
		const runtime = mockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});

		await setLLMConfig(runtime, {
			provider: 'openai',
			model: 'gpt-4o',
		});

		expect(runtime.setContext).toHaveBeenCalledWith({
			config: { provider: 'openai', model: 'gpt-4o' },
		});
	});

	it('preserves existing config fields not in the update', async () => {
		const runtime = mockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			reasoning: 'medium',
		});

		await setLLMConfig(runtime, { model: 'claude-opus-4' });

		expect(runtime.setContext).toHaveBeenCalledWith({
			config: {
				provider: 'anthropic',
				model: 'claude-opus-4',
				reasoning: 'medium',
			},
		});
	});

	// Regression: setLLMConfig reads from state() which strips apiKey via
	// snapshotLLMConfig. The config it sends to setContext therefore omits
	// apiKey and relies on config being merged by property so the existing key
	// is preserved. This test documents the payload shape; tracker-level merge
	// behavior is covered in ctx-tracker.test.ts.
	it('does not include apiKey in the setContext payload (state snapshots redact it)', async () => {
		const runtime = mockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			reasoning: 'medium',
		});

		await setLLMConfig(runtime, { reasoning: 'high' });

		const call = (runtime.setContext as ReturnType<typeof vi.fn>).mock
			.calls[0]![0] as { config: Record<string, unknown> };

		// apiKey must not be present — snapshotLLMConfig strips it
		expect(call.config).not.toHaveProperty('apiKey');
		// But the update is applied
		expect(call.config.reasoning).toBe('high');
	});
});
