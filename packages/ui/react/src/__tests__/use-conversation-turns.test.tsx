import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ConversationTurn } from '@franklin/extensions';
import { conversationExtension } from '@franklin/extensions';
import type { FranklinRuntime } from '@franklin/agent/browser';

import { AgentProvider } from '../agent/agent-context.js';
import { useConversationTurns } from '../conversation/use-conversation-turns.js';

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

function agentWrapper(runtime: FranklinRuntime) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <AgentProvider agent={runtime}>{children}</AgentProvider>;
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConversationTurns', () => {
	it('returns a store with the conversation turns', () => {
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

		expect(result.current.get()).toBe(turns);
	});

	it('returns an empty array when no turns exist', () => {
		const runtime = makeMockRuntime([]);
		const { result } = renderHook(() => useConversationTurns(), {
			wrapper: agentWrapper(runtime),
		});

		expect(result.current.get()).toEqual([]);
	});
});
