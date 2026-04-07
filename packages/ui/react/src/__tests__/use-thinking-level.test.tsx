import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';
import type { FranklinRuntime } from '@franklin/agent/browser';

import { AgentProvider } from '../agent/agent-context.js';
import { useThinkingLevel } from '../agent/use-thinking-level.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Listener = () => void;

function makeMockRuntime(initialReasoning: ThinkingLevel = 'medium'): {
	runtime: FranklinRuntime;
	/** The vi.fn() backing runtime.subscribe — use for assertions. */
	subscribeSpy: ReturnType<typeof vi.fn>;
	/** Simulate a runtime notification (e.g. setContext completed). */
	notify: () => void;
} {
	let reasoning: ThinkingLevel | undefined = initialReasoning;
	const listeners = new Set<Listener>();

	const subscribeSpy = vi.fn((listener: Listener) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	});

	const runtime = {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { reasoning },
			},
		})),
		setContext: vi.fn(
			async (ctx: { config?: { reasoning?: ThinkingLevel } }) => {
				if (ctx.config?.reasoning !== undefined) {
					reasoning = ctx.config.reasoning;
				}
				for (const l of listeners) l();
			},
		),
		subscribe: subscribeSpy,
	} as unknown as FranklinRuntime;

	return {
		runtime,
		subscribeSpy,
		notify: () => {
			for (const l of listeners) l();
		},
	};
}

function agentWrapper(runtime: FranklinRuntime) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <AgentProvider agent={runtime}>{children}</AgentProvider>;
	};
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('useThinkingLevel – initialization', () => {
	it('reads the initial level from the runtime', async () => {
		const { runtime } = makeMockRuntime('high');
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('high');
		});
	});

	it('defaults to medium when runtime has no reasoning set', async () => {
		const runtime = {
			state: vi.fn(async () => ({
				core: {
					history: { systemPrompt: '', messages: [] },
					llmConfig: {},
				},
			})),
			subscribe: vi.fn(() => () => {}),
			setContext: vi.fn(async () => {}),
		} as unknown as FranklinRuntime;

		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('medium');
		});
	});

	it('exposes the ordered levels list', () => {
		const { runtime } = makeMockRuntime();
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		expect(result.current.levels).toEqual([
			'off',
			'minimal',
			'low',
			'medium',
			'high',
			'xhigh',
		]);
	});
});

// ---------------------------------------------------------------------------
// setLevel
// ---------------------------------------------------------------------------

describe('useThinkingLevel – setLevel', () => {
	it('updates the level optimistically and calls setContext', async () => {
		const { runtime } = makeMockRuntime('medium');
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('medium');
		});

		await act(async () => {
			await result.current.setLevel('high');
		});

		expect(result.current.level).toBe('high');
		expect(runtime.setContext).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({ reasoning: 'high' }),
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// cycleLevel
// ---------------------------------------------------------------------------

describe('useThinkingLevel – cycleLevel', () => {
	it('advances to the next level', async () => {
		const { runtime } = makeMockRuntime('medium');
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('medium');
		});

		await act(async () => {
			await result.current.cycleLevel();
		});

		expect(result.current.level).toBe('high');
	});

	it('wraps from xhigh back to off', async () => {
		const { runtime } = makeMockRuntime('xhigh');
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('xhigh');
		});

		await act(async () => {
			await result.current.cycleLevel();
		});

		expect(result.current.level).toBe('off');
	});

	it('cycles through all levels in order', async () => {
		const { runtime } = makeMockRuntime('off');
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('off');
		});

		const seen: ThinkingLevel[] = [result.current.level];

		for (let i = 0; i < 6; i++) {
			await act(async () => {
				await result.current.cycleLevel();
			});
			seen.push(result.current.level);
		}

		expect(seen).toEqual([
			'off',
			'minimal',
			'low',
			'medium',
			'high',
			'xhigh',
			'off', // wraps
		]);
	});
});

// ---------------------------------------------------------------------------
// Reactivity
// ---------------------------------------------------------------------------

describe('useThinkingLevel – reactivity', () => {
	it('syncs when the runtime notifies a change', async () => {
		const { runtime, notify } = makeMockRuntime('low');
		const { result } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		await waitFor(() => {
			expect(result.current.level).toBe('low');
		});

		// Simulate external config change
		(runtime.state as ReturnType<typeof vi.fn>).mockResolvedValue({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { reasoning: 'xhigh' },
			},
		});

		act(() => {
			notify();
		});

		await waitFor(() => {
			expect(result.current.level).toBe('xhigh');
		});
	});

	it('subscribes to the runtime on mount and unsubscribes on unmount', () => {
		const { runtime, subscribeSpy } = makeMockRuntime();
		const { unmount } = renderHook(() => useThinkingLevel(), {
			wrapper: agentWrapper(runtime),
		});

		expect(subscribeSpy).toHaveBeenCalledTimes(1);

		unmount();

		// subscribe was called exactly once (on mount) and cleanup ran on unmount.
		expect(subscribeSpy).toHaveBeenCalledTimes(1);
	});
});
