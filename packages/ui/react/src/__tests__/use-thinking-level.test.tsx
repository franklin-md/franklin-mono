import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';
import type { FranklinRuntime } from '@franklin/agent/browser';
import { CORE_STATE } from '@franklin/extensions';

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
	/** Simulate a runtime notification (e.g. setLLMConfig completed). */
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
		[CORE_STATE]: {
			get: vi.fn(async () => ({
				core: {
					messages: [],
					llmConfig: { reasoning },
				},
			})),
			fork: vi.fn(async () => ({
				core: {
					messages: [],
					llmConfig: { reasoning },
				},
			})),
			child: vi.fn(async () => ({
				core: {
					messages: [],
					llmConfig: { reasoning },
				},
			})),
		},
		setLLMConfig: vi.fn(async (config: { reasoning?: ThinkingLevel }) => {
			if (config.reasoning !== undefined) {
				reasoning = config.reasoning;
			}
			for (const l of listeners) l();
		}),
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
			state: {
				get: vi.fn(async () => ({
					core: {
						messages: [],
						llmConfig: {},
					},
				})),
			},
			subscribe: vi.fn(() => () => {}),
			setLLMConfig: vi.fn(async () => {}),
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
	it('updates the level optimistically and calls setLLMConfig', async () => {
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
		expect(runtime.setLLMConfig).toHaveBeenCalledWith(
			expect.objectContaining({ reasoning: 'high' }),
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

		for (let i = 0; i < 5; i++) {
			await act(async () => {
				await result.current.cycleLevel();
			});
			seen.push(result.current.level);
		}

		expect(seen).toEqual([
			'off',
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
		(runtime[CORE_STATE].get as ReturnType<typeof vi.fn>).mockResolvedValue({
			core: {
				messages: [],
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
