import { describe, it, expect, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { RuntimeEntry } from '@franklin/extensions';

import { AppContext } from '../agent/franklin-context.js';
import { AgentsProvider } from '../agent/agents-context.js';
import { AgentList } from '../agent/agent-list.js';
import type { AgentItemProps } from '../agent/agent-list.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Listener = () => void;

function makeMockAgents(initial: RuntimeEntry<FranklinRuntime>[] = []) {
	const sessions: RuntimeEntry<FranklinRuntime>[] = [...initial];
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

function TestItem({ sessionId, isActive, onSelect, onRemove }: AgentItemProps) {
	return (
		<div data-testid={`item-${sessionId}`} data-active={isActive}>
			<span>{sessionId}</span>
			<button onClick={onSelect}>select</button>
			<button onClick={onRemove}>remove</button>
		</div>
	);
}

function TestEmpty() {
	return <div data-testid="empty">No agents</div>;
}

function makeTestTree(
	agents: ReturnType<typeof makeMockAgents>,
	components: Parameters<typeof AgentList>[0]['components'],
) {
	const mockApp = { agents, settings: { get: () => ({}) } };
	return function Tree() {
		return (
			<AppContext.Provider value={mockApp as never}>
				<AgentsProvider>
					<AgentList components={components} />
				</AgentsProvider>
			</AppContext.Provider>
		);
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentList', () => {
	it('renders Empty when there are no sessions', () => {
		const agents = makeMockAgents();
		const Tree = makeTestTree(agents, { Item: TestItem, Empty: TestEmpty });

		const { container } = render(<Tree />);

		expect(container.querySelector('[data-testid="empty"]')).toBeTruthy();
	});

	it('renders nothing when there are no sessions and no Empty component', () => {
		const agents = makeMockAgents();
		const Tree = makeTestTree(agents, { Item: TestItem });

		const { container } = render(<Tree />);

		expect(container.textContent).toBe('');
	});

	it('renders one Item per session', () => {
		const sessions: RuntimeEntry<FranklinRuntime>[] = [
			{ id: 'a', runtime: {} as FranklinRuntime },
			{ id: 'b', runtime: {} as FranklinRuntime },
		];
		const agents = makeMockAgents(sessions);
		const Tree = makeTestTree(agents, { Item: TestItem });

		const { container } = render(<Tree />);

		expect(container.querySelector('[data-testid="item-a"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="item-b"]')).toBeTruthy();
	});

	it('auto-selects the only session on mount', () => {
		const sessions: RuntimeEntry<FranklinRuntime>[] = [
			{ id: 'a', runtime: {} as FranklinRuntime },
		];
		const agents = makeMockAgents(sessions);
		const Tree = makeTestTree(agents, { Item: TestItem });

		const { container } = render(<Tree />);

		const item = container.querySelector('[data-testid="item-a"]');
		expect(item?.getAttribute('data-active')).toBe('true');
	});

	it('clicking select marks the item as active', () => {
		const sessions: RuntimeEntry<FranklinRuntime>[] = [
			{ id: 'a', runtime: {} as FranklinRuntime },
			{ id: 'b', runtime: {} as FranklinRuntime },
		];
		const agents = makeMockAgents(sessions);

		function TreeWithList() {
			const mockApp = { agents, settings: { get: () => ({}) } };
			return (
				<AppContext.Provider value={mockApp as never}>
					<AgentsProvider>
						<AgentList components={{ Item: TestItem }} />
					</AgentsProvider>
				</AppContext.Provider>
			);
		}

		const { container } = render(<TreeWithList />);

		const selectButton = container.querySelector(
			'[data-testid="item-a"] button',
		) as HTMLElement;
		act(() => {
			fireEvent.click(selectButton);
		});

		const itemA = container.querySelector('[data-testid="item-a"]');
		const itemB = container.querySelector('[data-testid="item-b"]');
		expect(itemA?.getAttribute('data-active')).toBe('true');
		expect(itemB?.getAttribute('data-active')).toBe('false');
	});
});
