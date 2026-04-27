import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

import {
	createStore,
	statusExtension,
	type Store,
	type StoreEntry,
} from '@franklin/extensions';
import type { FranklinRuntime } from '@franklin/agent/browser';
import type { StatusState } from '@franklin/extensions';

import { useAutoMarkRead } from '../agent/use-auto-mark-read.js';
import { AgentProvider } from '../agent/agent-context.js';

function makeAgentWithStatus(initial: StatusState): {
	agent: FranklinRuntime;
	store: Store<StatusState>;
} {
	const store = createStore<StatusState>(initial);
	const entry: StoreEntry = {
		ref: crypto.randomUUID(),
		store: store as Store<unknown>,
		sharing: 'private',
	};
	const entries = new Map<string, StoreEntry>([['status', entry]]);
	const agent = {
		getStore: (name: string) => {
			const e = entries.get(name);
			if (!e) throw new Error(`no store named "${name}"`);
			return e.store;
		},
	} as unknown as FranklinRuntime;
	return { agent, store };
}

function agentWrapper(agent: FranklinRuntime) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <AgentProvider agent={agent}>{children}</AgentProvider>;
	};
}

describe('useAutoMarkRead', () => {
	it('clears unread on the active session when turnEnd fires (unread → idle)', () => {
		const { agent, store } = makeAgentWithStatus('idle');

		renderHook(() => useAutoMarkRead(true), {
			wrapper: agentWrapper(agent),
		});

		// Simulate the turn lifecycle on the active session.
		act(() => {
			store.set(() => 'in-progress');
		});
		expect(store.get()).toBe('in-progress');

		act(() => {
			store.set(() => 'unread');
		});

		// Hook should immediately mark it read on the active session.
		expect(store.get()).toBe('idle');
	});

	it('clears unread when an inactive session with unread becomes active', () => {
		const { agent, store } = makeAgentWithStatus('unread');

		const { rerender } = renderHook(
			({ isActive }: { isActive: boolean }) => useAutoMarkRead(isActive),
			{
				wrapper: agentWrapper(agent),
				initialProps: { isActive: false },
			},
		);

		// Inactive: status is preserved.
		expect(store.get()).toBe('unread');

		// Activating the session should clear unread.
		act(() => {
			rerender({ isActive: true });
		});
		expect(store.get()).toBe('idle');
	});

	it('leaves unread alone on inactive sessions', () => {
		const { agent, store } = makeAgentWithStatus('idle');

		renderHook(() => useAutoMarkRead(false), {
			wrapper: agentWrapper(agent),
		});

		act(() => {
			store.set(() => 'unread');
		});

		expect(store.get()).toBe('unread');
	});

	it('does not interfere with in-progress on the active session', () => {
		const { agent, store } = makeAgentWithStatus('idle');

		renderHook(() => useAutoMarkRead(true), {
			wrapper: agentWrapper(agent),
		});

		act(() => {
			store.set(() => 'in-progress');
		});

		expect(store.get()).toBe('in-progress');
	});

	it('uses the status extension key (smoke check on wiring)', () => {
		// StoreKey is a branded string at runtime — the key IS its name.
		expect(statusExtension.keys.status as string).toBe('status');
	});
});
