import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { FranklinRuntime } from '@franklin/agent';
import type { CoreEvent } from '@franklin/agent';
import { CORE_STATE } from '@franklin/agent/testing';
import { ZERO_USAGE, type ThinkingLevel } from '@franklin/mini-acp';

import { AgentProvider } from '../agent/agent-context.js';
import { AppContext } from '../agent/franklin-context.js';
import { useModelSelection } from '../agent/use-model-selection.js';
import { useThinkingLevel } from '../agent/use-thinking-level.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Listener = () => void;
type CoreEventListener = (event: CoreEvent) => void;

function makeMockRuntime(opts?: {
	provider?: string;
	model?: string;
	reasoning?: ThinkingLevel;
}): {
	runtime: FranklinRuntime;
	notify: () => void;
} {
	let provider = opts?.provider;
	let model = opts?.model;
	let reasoning = opts?.reasoning;
	const listeners = new Set<CoreEventListener>();

	const runtime = {
		[CORE_STATE]: {
			get: vi.fn(async () => ({
				messages: [],
				llmConfig: { provider, model, reasoning },
				usage: ZERO_USAGE,
			})),
			fork: vi.fn(async () => ({
				messages: [],
				llmConfig: { provider, model, reasoning },
				usage: ZERO_USAGE,
			})),
			child: vi.fn(async () => ({
				messages: [],
				llmConfig: { provider, model, reasoning },
				usage: ZERO_USAGE,
			})),
		},
		setLLMConfig: vi.fn(
			async (config: {
				provider?: string;
				model?: string;
				reasoning?: ThinkingLevel;
			}) => {
				if (config.provider !== undefined) provider = config.provider;
				if (config.model !== undefined) model = config.model;
				if (config.reasoning !== undefined) reasoning = config.reasoning;
				for (const l of listeners) l({ type: 'llm-config-changed' });
			},
		),
		coreEvents: {
			subscribe: vi.fn((listener: CoreEventListener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			}),
		},
		subscribe: vi.fn((listener: Listener) => {
			const coreListener: CoreEventListener = () => listener();
			listeners.add(coreListener);
			return () => {
				listeners.delete(coreListener);
			};
		}),
	} as unknown as FranklinRuntime;

	return {
		runtime,
		notify: () => {
			for (const l of listeners) l({ type: 'llm-config-changed' });
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
	it('updates from the observer and calls setLLMConfig', async () => {
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

		await act(async () => {
			await result.current.setModel('openai-codex', 'gpt-5.4');
		});

		await waitFor(() => {
			expect(result.current.provider).toBe('openai-codex');
			expect(result.current.model).toBe('gpt-5.4');
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

	it('preserves model and thinking changes made before observers resync', async () => {
		const { runtime } = makeMockRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			reasoning: 'medium',
		});
		const { result } = renderHook(
			() => ({
				modelSelection: useModelSelection(),
				thinkingLevel: useThinkingLevel(),
			}),
			{ wrapper: makeWrapper(runtime) },
		);

		await waitFor(() => {
			expect(result.current.modelSelection.provider).toBe('anthropic');
			expect(result.current.thinkingLevel.level).toBe('medium');
		});

		await act(async () => {
			await Promise.all([
				result.current.modelSelection.setModel('openai-codex', 'gpt-5.4'),
				result.current.thinkingLevel.setLevel('high'),
			]);
		});

		await waitFor(() => {
			expect(result.current.modelSelection.provider).toBe('openai-codex');
			expect(result.current.modelSelection.model).toBe('gpt-5.4');
			expect(result.current.thinkingLevel.level).toBe('high');
		});
	});
});
