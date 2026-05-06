import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { RuntimeEntry } from '@franklin/extensions';

import { AppContext } from '../agent/franklin-context.js';
import { useAgentList } from '../agent/use-agent-list.js';
import { AgentsProvider } from '../agent/agents-context.js';
import { useAgents } from '../agent/agents-context.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Listener = () => void;

function makeMockAgents() {
	const sessions: RuntimeEntry<FranklinRuntime>[] = [];
	const listeners = new Set<Listener>();
	let nextId = 1;

	return {
		sessions,
		create: vi.fn(async () => {
			const session: RuntimeEntry<FranklinRuntime> = {
				id: `agent-${nextId++}`,
				runtime: {} as FranklinRuntime,
			};
			sessions.push(session);
			for (const l of listeners) l();
			return session;
		}),
		get: vi.fn((id: string) => sessions.find((s) => s.id === id)),
		list: vi.fn(() => [...sessions]),
		remove: vi.fn(async (id: string) => {
			const idx = sessions.findIndex((s) => s.id === id);
			if (idx === -1) return false;
			sessions.splice(idx, 1);
			for (const l of listeners) l();
			return true;
		}),
		subscribe: vi.fn((listener: Listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};
}

function makeWrapper(agents: ReturnType<typeof makeMockAgents>) {
	const mockApp = { agents, settings: { get: () => ({}) } };
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<AppContext.Provider value={mockApp as never}>
				{children}
			</AppContext.Provider>
		);
	};
}

function makeProviderWrapper(agents: ReturnType<typeof makeMockAgents>) {
	const mockApp = { agents, settings: { get: () => ({}) } };
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<AppContext.Provider value={mockApp as never}>
				<AgentsProvider>{children}</AgentsProvider>
			</AppContext.Provider>
		);
	};
}

async function createSession(result: {
	current: ReturnType<typeof useAgentList>;
}): Promise<RuntimeEntry<FranklinRuntime>> {
	let session: RuntimeEntry<FranklinRuntime> | undefined;
	await act(async () => {
		session = await result.current.create();
	});
	return session as RuntimeEntry<FranklinRuntime>;
}

// ---------------------------------------------------------------------------
// useAgentList (internal hook)
// ---------------------------------------------------------------------------

describe('useAgentList', () => {
	it('auto-selects the last restored session when there is no active selection', async () => {
		const agents = makeMockAgents();
		agents.sessions.push(
			{ id: 'agent-1', runtime: {} as FranklinRuntime },
			{ id: 'agent-2', runtime: {} as FranklinRuntime },
		);
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		await waitFor(() => {
			expect(result.current.activeSessionId).toBe('agent-2');
		});
		expect(result.current.activeSession?.id).toBe('agent-2');
	});

	it('select updates activeSessionId and activeSession', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const first = await createSession(result);
		expect(result.current.activeSessionId).toBe(first.id);
		expect(result.current.activeSession).toBe(
			result.current.sessions.find((s) => s.id === first.id),
		);

		// Create a second session (auto-selected)
		const second = await createSession(result);
		expect(result.current.activeSessionId).toBe(second.id);

		// Select the first session
		act(() => {
			result.current.select(first.id);
		});

		expect(result.current.activeSessionId).toBe(first.id);
		expect(result.current.activeSession).toBe(
			result.current.sessions.find((s) => s.id === first.id),
		);
	});

	it('create auto-selects the new session', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		expect(result.current.activeSessionId).toBeNull();
		expect(result.current.activeSession).toBeUndefined();

		const created = await createSession(result);

		expect(result.current.activeSessionId).toBe(created.id);
		expect(result.current.activeSession?.id).toBe(created.id);
		expect(agents.create).toHaveBeenCalledTimes(1);
	});

	it('deleting the active session selects the previous session in the list', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const first = await createSession(result);
		const second = await createSession(result);

		// Select the second (it's already active from create, but be explicit)
		act(() => {
			result.current.select(second.id);
		});

		expect(result.current.activeSessionId).toBe(second.id);

		// Delete the second — should fall back to first (the previous)
		await act(async () => {
			result.current.remove(second.id);
		});

		expect(result.current.activeSessionId).toBe(first.id);
		expect(result.current.activeSession?.id).toBe(first.id);
	});

	it('deleting the last session clears selection', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const only = await createSession(result);
		expect(result.current.activeSessionId).toBe(only.id);

		await act(async () => {
			result.current.remove(only.id);
		});

		expect(result.current.activeSessionId).toBeNull();
		expect(result.current.activeSession).toBeUndefined();
		expect(result.current.sessions).toHaveLength(0);
	});

	it('deleting a non-active session does not change selection', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const first = await createSession(result);
		const second = await createSession(result);

		// Active is now the second (auto-selected on create)
		expect(result.current.activeSessionId).toBe(second.id);

		// Delete the first (not active)
		await act(async () => {
			result.current.remove(first.id);
		});

		// Selection should remain on the second
		expect(result.current.activeSessionId).toBe(second.id);
		expect(result.current.activeSession?.id).toBe(second.id);
	});
});

// ---------------------------------------------------------------------------
// AgentsProvider + useAgents (context-based API)
// ---------------------------------------------------------------------------

describe('AgentsProvider + useAgents', () => {
	it('provides the same control surface as the internal hook', async () => {
		const agents = makeMockAgents();
		const wrapper = makeProviderWrapper(agents);

		const { result } = renderHook(() => useAgents(), { wrapper });

		expect(result.current.sessions).toEqual([]);
		expect(result.current.activeSessionId).toBeNull();
		expect(result.current.activeSession).toBeUndefined();
		expect(typeof result.current.select).toBe('function');
		expect(typeof result.current.create).toBe('function');
		expect(typeof result.current.remove).toBe('function');
	});

	it('create and select work through the provider', async () => {
		const agents = makeMockAgents();
		const wrapper = makeProviderWrapper(agents);

		const { result } = renderHook(() => useAgents(), { wrapper });

		let session: RuntimeEntry<FranklinRuntime> | undefined;
		await act(async () => {
			session = await result.current.create();
		});

		expect(session).toBeDefined();
		expect(result.current.activeSessionId).toBe(session?.id);
		expect(result.current.activeSession?.id).toBe(session?.id);
	});

	it('throws when used outside AgentsProvider', () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		expect(() => {
			renderHook(() => useAgents());
		}).toThrow('useAgents must be used inside a <AgentsProvider>');

		consoleError.mockRestore();
	});
});
