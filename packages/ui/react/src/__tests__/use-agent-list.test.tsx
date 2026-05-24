import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { FranklinRuntime } from '@franklin/agent';
import type { RuntimeEntry } from '@franklin/agent';

import { HarnessProvider } from '../agent/harness-context.js';
import {
	type AgentCreateInput,
	useAgentList,
} from '../agent/use-agent-list.js';
import { AgentsProvider } from '../agent/agents-context.js';
import { useAgents } from '../agent/agents-context.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Listener = () => void;
type Visibility = RuntimeEntry<FranklinRuntime>['details']['visibility'];

function createEntry(
	id: string,
	visibility: Visibility = 'visible',
): RuntimeEntry<FranklinRuntime> {
	return {
		details: { id, visibility },
		runtime: {} as FranklinRuntime,
	};
}

function makeMockAgents() {
	const sessions: RuntimeEntry<FranklinRuntime>[] = [];
	const listeners = new Set<Listener>();
	let nextId = 1;

	return {
		sessions,
		create: vi.fn(async (input?: AgentCreateInput) => {
			const visibility = input?.state?.details?.visibility ?? 'visible';
			const session = createEntry(`agent-${nextId++}`, visibility);
			sessions.push(session);
			for (const l of listeners) l();
			return session;
		}),
		get: vi.fn((id: string) => sessions.find((s) => s.details.id === id)),
		list: vi.fn(() => [...sessions]),
		remove: vi.fn(async (id: string) => {
			const idx = sessions.findIndex((s) => s.details.id === id);
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
			<HarnessProvider harness={mockApp as never}>{children}</HarnessProvider>
		);
	};
}

function makeProviderWrapper(agents: ReturnType<typeof makeMockAgents>) {
	const mockApp = { agents, settings: { get: () => ({}) } };
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<HarnessProvider harness={mockApp as never}>
				<AgentsProvider>{children}</AgentsProvider>
			</HarnessProvider>
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
	it('exposes only visible restored sessions and selects the last visible session', async () => {
		const agents = makeMockAgents();
		agents.sessions.push(
			createEntry('agent-1'),
			createEntry('hidden-child', 'hidden'),
			createEntry('agent-2'),
		);
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		await waitFor(() => {
			expect(result.current.activeSessionId).toBe('agent-2');
		});
		expect(
			result.current.sessions.map((session) => session.details.id),
		).toEqual(['agent-1', 'agent-2']);
	});

	it('can include hidden restored sessions when requested', async () => {
		const agents = makeMockAgents();
		agents.sessions.push(
			createEntry('agent-1'),
			createEntry('hidden-child', 'hidden'),
		);
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(
			() => useAgentList({ includeHiddenSessions: true }),
			{ wrapper },
		);

		await waitFor(() => {
			expect(result.current.activeSessionId).toBe('hidden-child');
		});
		expect(
			result.current.sessions.map((session) => session.details.id),
		).toEqual(['agent-1', 'hidden-child']);
	});

	it('auto-selects the last restored session when there is no active selection', async () => {
		const agents = makeMockAgents();
		agents.sessions.push(createEntry('agent-1'), createEntry('agent-2'));
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		await waitFor(() => {
			expect(result.current.activeSessionId).toBe('agent-2');
		});
		expect(result.current.activeSession?.details.id).toBe('agent-2');
	});

	it('select updates activeSessionId and activeSession', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const first = await createSession(result);
		expect(result.current.activeSessionId).toBe(first.details.id);
		expect(result.current.activeSession).toBe(
			result.current.sessions.find((s) => s.details.id === first.details.id),
		);

		// Create a second session (auto-selected)
		const second = await createSession(result);
		expect(result.current.activeSessionId).toBe(second.details.id);

		// Select the first session
		act(() => {
			result.current.select(first.details.id);
		});

		expect(result.current.activeSessionId).toBe(first.details.id);
		expect(result.current.activeSession).toBe(
			result.current.sessions.find((s) => s.details.id === first.details.id),
		);
	});

	it('create auto-selects the new session', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		expect(result.current.activeSessionId).toBeNull();
		expect(result.current.activeSession).toBeUndefined();

		const created = await createSession(result);

		expect(result.current.activeSessionId).toBe(created.details.id);
		expect(result.current.activeSession?.details.id).toBe(created.details.id);
		expect(agents.create).toHaveBeenCalledTimes(1);
	});

	it('does not select hidden sessions created through the controller', async () => {
		const agents = makeMockAgents();
		agents.sessions.push(createEntry('agent-1'));
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		await waitFor(() => {
			expect(result.current.activeSessionId).toBe('agent-1');
		});

		let created: RuntimeEntry<FranklinRuntime> | undefined;
		await act(async () => {
			created = await result.current.create({
				state: { details: { visibility: 'hidden' } },
			});
		});

		expect(created?.details.visibility).toBe('hidden');
		expect(result.current.activeSessionId).toBe('agent-1');
		expect(
			result.current.sessions.map((session) => session.details.id),
		).toEqual(['agent-1']);
	});

	it('selects hidden sessions created through the controller when hidden sessions are included', async () => {
		const agents = makeMockAgents();
		agents.sessions.push(createEntry('seed-agent'));
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(
			() => useAgentList({ includeHiddenSessions: true }),
			{ wrapper },
		);

		await waitFor(() => {
			expect(result.current.activeSessionId).toBe('seed-agent');
		});

		let created: RuntimeEntry<FranklinRuntime> | undefined;
		await act(async () => {
			created = await result.current.create({
				state: { details: { visibility: 'hidden' } },
			});
		});

		expect(created?.details.visibility).toBe('hidden');
		expect(result.current.activeSessionId).toBe(created?.details.id);
		expect(
			result.current.sessions.map((session) => session.details.id),
		).toEqual(['seed-agent', created?.details.id]);
	});

	it('deleting the active session selects the previous session in the list', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const first = await createSession(result);
		const second = await createSession(result);

		// Select the second (it's already active from create, but be explicit)
		act(() => {
			result.current.select(second.details.id);
		});

		expect(result.current.activeSessionId).toBe(second.details.id);

		// Delete the second — should fall back to first (the previous)
		await act(async () => {
			result.current.remove(second.details.id);
		});

		expect(result.current.activeSessionId).toBe(first.details.id);
		expect(result.current.activeSession?.details.id).toBe(first.details.id);
	});

	it('deleting the last session clears selection', async () => {
		const agents = makeMockAgents();
		const wrapper = makeWrapper(agents);

		const { result } = renderHook(() => useAgentList(), { wrapper });

		const only = await createSession(result);
		expect(result.current.activeSessionId).toBe(only.details.id);

		await act(async () => {
			result.current.remove(only.details.id);
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
		expect(result.current.activeSessionId).toBe(second.details.id);

		// Delete the first (not active)
		await act(async () => {
			result.current.remove(first.details.id);
		});

		// Selection should remain on the second
		expect(result.current.activeSessionId).toBe(second.details.id);
		expect(result.current.activeSession?.details.id).toBe(second.details.id);
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
		expect(result.current.activeSessionId).toBe(session?.details.id);
		expect(result.current.activeSession?.details.id).toBe(session?.details.id);
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
