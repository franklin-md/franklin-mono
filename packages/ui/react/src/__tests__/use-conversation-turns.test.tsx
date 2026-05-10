import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ConversationTurn } from '@franklin/extensions';
import { conversationExtension } from '@franklin/extensions';
import type { FranklinRuntime } from '@franklin/agent/browser';

import { AgentProvider } from '../agent/agent-context.js';
import {
	useConversationTurns,
	useThrottledConversationTurns,
} from '../conversation/use-conversation-turns.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRuntime(turns: ConversationTurn[]): FranklinRuntime {
	const conversationKey = conversationExtension.keys.conversation;
	const listeners = new Set<(v: unknown) => void>();

	const store = {
		get: () => turns,
		set: vi.fn(),
		subscribe: (listener: (v: unknown) => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};

	return {
		state: {
			get: vi.fn(async () => ({})),
		},
		subscribe: vi.fn(() => () => {}),
		getStore: (name: string) => {
			if (name === conversationKey) return store;
			throw new Error(`No store named "${name}"`);
		},
	} as unknown as FranklinRuntime;
}

function makeMutableMockRuntime(initial: ConversationTurn[]) {
	const conversationKey = conversationExtension.keys.conversation;
	const listeners = new Set<(v: unknown) => void>();
	let turns = initial;

	const store = {
		get: () => turns,
		set: vi.fn(),
		subscribe: (listener: (v: unknown) => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};

	const runtime = {
		state: {
			get: vi.fn(async () => ({})),
		},
		subscribe: vi.fn(() => () => {}),
		getStore: (name: string) => {
			if (name === conversationKey) return store;
			throw new Error(`No store named "${name}"`);
		},
	} as unknown as FranklinRuntime;

	return {
		runtime,
		setTurns: (next: ConversationTurn[]) => {
			turns = next;
			for (const listener of listeners) listener(turns);
		},
	};
}

function agentWrapper(runtime: FranklinRuntime) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <AgentProvider agent={runtime}>{children}</AgentProvider>;
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
	vi.useRealTimers();
});

describe('useConversationTurns', () => {
	it('returns the conversation turns', () => {
		const turns: ConversationTurn[] = [
			{
				id: 'turn-1',
				timestamp: Date.now(),
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'Hello' }],
				},
				response: { blocks: [{ kind: 'text', text: 'Hi!', startedAt: 0 }] },
			},
		];

		const runtime = makeMockRuntime(turns);
		const { result } = renderHook(() => useConversationTurns(), {
			wrapper: agentWrapper(runtime),
		});

		expect(result.current).toBe(turns);
	});

	it('returns an empty array when no turns exist', () => {
		const runtime = makeMockRuntime([]);
		const { result } = renderHook(() => useConversationTurns(), {
			wrapper: agentWrapper(runtime),
		});

		expect(result.current).toEqual([]);
	});

	it('publishes conversation turn updates immediately', () => {
		const turn: ConversationTurn = {
			id: 'turn-1',
			timestamp: Date.now(),
			prompt: {
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			response: { blocks: [{ kind: 'text', text: 'Hi!', startedAt: 0 }] },
		};
		const { runtime, setTurns } = makeMutableMockRuntime([]);
		const { result } = renderHook(() => useConversationTurns(), {
			wrapper: agentWrapper(runtime),
		});

		act(() => {
			setTurns([turn]);
		});

		expect(result.current).toEqual([turn]);
	});

	it('throttles conversation turn updates when requested', () => {
		vi.useFakeTimers();
		const turn: ConversationTurn = {
			id: 'turn-1',
			timestamp: Date.now(),
			prompt: {
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			response: { blocks: [{ kind: 'text', text: 'Hi!', startedAt: 0 }] },
		};
		const { runtime, setTurns } = makeMutableMockRuntime([]);
		const { result } = renderHook(() => useThrottledConversationTurns(), {
			wrapper: agentWrapper(runtime),
		});

		act(() => {
			setTurns([turn]);
		});

		expect(result.current).toEqual([]);

		act(() => {
			vi.advanceTimersByTime(15);
		});

		expect(result.current).toEqual([]);

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(result.current).toEqual([turn]);
	});
});
