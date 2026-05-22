import { describe, it, expect, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';

import type { FranklinRuntime } from '@franklin/agent';
import type { RuntimeEntry } from '@franklin/agent';

import { HarnessProvider } from '../agent/harness-context.js';
import { AgentsProvider } from '../agent/agents-context.js';
import { AgentList } from '../agent/agent-list.js';
import type { AgentItemProps } from '../agent/agent-list.js';

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

function makeMockAgents(initial: RuntimeEntry<FranklinRuntime>[] = []) {
	const sessions: RuntimeEntry<FranklinRuntime>[] = [...initial];
	const listeners = new Set<Listener>();
	let nextId = 1;

	return {
		sessions,
		create: vi.fn(async () => {
			const session = createEntry(`agent-${nextId++}`);
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
			<HarnessProvider harness={mockApp as never}>
				<AgentsProvider>
					<AgentList components={components} />
				</AgentsProvider>
			</HarnessProvider>
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
			createEntry('a'),
			createEntry('b'),
		];
		const agents = makeMockAgents(sessions);
		const Tree = makeTestTree(agents, { Item: TestItem });

		const { container } = render(<Tree />);

		expect(container.querySelector('[data-testid="item-a"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="item-b"]')).toBeTruthy();
	});

	it('renders only visible sessions', () => {
		const sessions: RuntimeEntry<FranklinRuntime>[] = [
			createEntry('a'),
			createEntry('hidden-child', 'hidden'),
			createEntry('b'),
		];
		const agents = makeMockAgents(sessions);
		const Tree = makeTestTree(agents, { Item: TestItem });

		const { container } = render(<Tree />);

		expect(container.querySelector('[data-testid="item-a"]')).toBeTruthy();
		expect(
			container.querySelector('[data-testid="item-hidden-child"]'),
		).toBeNull();
		expect(container.querySelector('[data-testid="item-b"]')).toBeTruthy();
	});

	it('auto-selects the only session on mount', () => {
		const sessions: RuntimeEntry<FranklinRuntime>[] = [createEntry('a')];
		const agents = makeMockAgents(sessions);
		const Tree = makeTestTree(agents, { Item: TestItem });

		const { container } = render(<Tree />);

		const item = container.querySelector('[data-testid="item-a"]');
		expect(item?.getAttribute('data-active')).toBe('true');
	});

	it('clicking select marks the item as active', () => {
		const sessions: RuntimeEntry<FranklinRuntime>[] = [
			createEntry('a'),
			createEntry('b'),
		];
		const agents = makeMockAgents(sessions);

		function TreeWithList() {
			const mockApp = { agents, settings: { get: () => ({}) } };
			return (
				<HarnessProvider harness={mockApp as never}>
					<AgentsProvider>
						<AgentList components={{ Item: TestItem }} />
					</AgentsProvider>
				</HarnessProvider>
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
