import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';

import { AgentProvider } from '../agent/agent-context.js';
import { AppContext } from '../agent/franklin-context.js';
import { useModelSelection } from '../agent/use-model-selection.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Listener = () => void;

function makeMockRuntime(opts?: { provider?: string; model?: string }): {
	runtime: FranklinRuntime;
	notify: () => void;
} {
	const provider = opts?.provider;
	const model = opts?.model;
	const listeners = new Set<Listener>();

	const runtime = {
		state: vi.fn(async () => ({
			core: {
				messages: [],
				llmConfig: { provider, model },
			},
		})),
		setLLMConfig: vi.fn(async () => {
			for (const l of listeners) l();
		}),
		subscribe: vi.fn((listener: Listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	} as unknown as FranklinRuntime;

	return {
		runtime,
		notify: () => {
			for (const l of listeners) l();
		},
	};
}

function makeMockApp(
	defaultProvider = 'anthropic',
	defaultModel = 'claude-sonnet-4-5',
) {
	const listeners = new Set<(v: unknown) => void>();
	const settings = {
		defaultLLMConfig: {
			provider: defaultProvider,
			model: defaultModel,
		},
	};

	return {
		settings: {
			get: () => settings,
			set: (recipe: (draft: typeof settings) => void) => {
				recipe(settings);
				for (const l of listeners) l(settings);
			},
			subscribe: (listener: (v: unknown) => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		},
		agents: { list: () => [] },
	};
}

function makeWrapper(
	runtime: FranklinRuntime,
	app?: ReturnType<typeof makeMockApp>,
) {
	const mockApp = app ?? makeMockApp();
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<AppContext.Provider value={mockApp as never}>
				<AgentProvider agent={runtime}>{children}</AgentProvider>
			</AppContext.Provider>
		);
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useModelSelection – initialization', () => {
	it('reads initial model from the runtime', async () => {
		const { runtime } = makeMockRuntime({
			provider: 'openai-codex',
			model: 'gpt-5.4',
		});
		const { result } = renderHook(() => useModelSelection(), {
			wrapper: makeWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.provider).toBe('openai-codex');
			expect(result.current.model).toBe('gpt-5.4');
		});
	});

	it('falls back to settings defaults when runtime has no model', async () => {
		const { runtime } = makeMockRuntime();
		const app = makeMockApp('anthropic', 'claude-sonnet-4-5');
		const { result } = renderHook(() => useModelSelection(), {
			wrapper: makeWrapper(runtime, app),
		});

		await waitFor(() => {
			expect(result.current.provider).toBe('anthropic');
			expect(result.current.model).toBe('claude-sonnet-4-5');
		});
	});
});

describe('useModelSelection – setModel', () => {
	it('updates optimistically and calls setLLMConfig', async () => {
		const { runtime } = makeMockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});
		const { result } = renderHook(() => useModelSelection(), {
			wrapper: makeWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.provider).toBe('anthropic');
		});

		act(() => {
			void result.current.setModel('openai-codex', 'gpt-5.4');
		});

		// Optimistic update
		expect(result.current.provider).toBe('openai-codex');
		expect(result.current.model).toBe('gpt-5.4');

		// setLLMConfig is async; it delegates to runtime.setLLMConfig.
		await waitFor(() => {
			expect(runtime.setLLMConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: 'openai-codex',
					model: 'gpt-5.4',
				}),
			);
		});
	});

	it('updates the settings store', async () => {
		const { runtime } = makeMockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});
		const app = makeMockApp();
		const { result } = renderHook(() => useModelSelection(), {
			wrapper: makeWrapper(runtime, app),
		});

		await waitFor(() => {
			expect(result.current.provider).toBe('anthropic');
		});

		await act(async () => {
			await result.current.setModel('openrouter', 'z-ai/glm-5.1');
		});

		expect(app.settings.get().defaultLLMConfig).toEqual(
			expect.objectContaining({
				provider: 'openrouter',
				model: 'z-ai/glm-5.1',
			}),
		);
	});
});
