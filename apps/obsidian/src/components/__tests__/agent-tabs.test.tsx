// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	AgentCreateInput,
	FranklinApp,
	FranklinRuntime,
} from '@franklin/agent/browser';
import { statusExtension, type StatusState } from '@franklin/extensions';
import { toAbsolutePath } from '@franklin/lib';
import type { Session } from '@franklin/extensions';
import { AppContext } from '@franklin/react';

import { createObsidianSessionInput } from '../../app/agent.js';
import { ConversationWindow } from '../conversation-window/window.js';

vi.mock('../conversation.js', () => ({
	ConversationPanel() {
		return <div data-testid="conversation-panel" />;
	},
}));

afterEach(() => {
	cleanup();
});

type Listener<T> = (value: T) => void;

function createStore<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener<T>>();

	return {
		get() {
			return value;
		},
		set(next: T | ((prev: T) => T)) {
			value =
				typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
			for (const listener of listeners) {
				listener(value);
			}
		},
		subscribe(listener: Listener<T>) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

type TestRuntime = FranklinRuntime & {
	statusStore: ReturnType<typeof createStore<StatusState>>;
};

type TestSession = Session<FranklinRuntime> & { runtime: TestRuntime };

function createRuntime(status: StatusState): TestRuntime {
	const statusStore = createStore(status);

	return {
		statusStore,
		getStore(name: string) {
			if (name !== statusExtension.keys.status) {
				throw new Error(`Unknown store: ${name}`);
			}
			return statusStore;
		},
	} as TestRuntime;
}

function createSession(id: string, status: StatusState): TestSession {
	return {
		id,
		runtime: createRuntime(status),
	};
}

function createAgents(initialSessions: TestSession[]) {
	const sessions = [...initialSessions];
	const listeners = new Set<() => void>();
	let nextId = sessions.length + 1;

	const agents = {
		create: vi.fn(async (_input?: AgentCreateInput) => {
			const session = createSession(`session-${nextId++}`, 'idle');
			sessions.push(session);
			for (const listener of listeners) {
				listener();
			}
			return session;
		}),
		get: vi.fn((id: string) => sessions.find((session) => session.id === id)),
		list: vi.fn(() => [...sessions]),
		remove: vi.fn(async (id: string) => {
			const index = sessions.findIndex((session) => session.id === id);
			if (index === -1) {
				return false;
			}

			sessions.splice(index, 1);
			for (const listener of listeners) {
				listener();
			}
			return true;
		}),
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	return { agents, sessions };
}

function renderApp(initialSessions: TestSession[]) {
	const { agents } = createAgents(initialSessions);
	const defaultLLMConfig = {
		provider: 'openai-codex',
		model: 'gpt-5.4',
		reasoning: 'medium' as const,
	};
	const app = {
		agents,
		auth: {
			entries: () => ({}),
		},
		settings: {
			get: () => ({
				defaultLLMConfig,
			}),
		},
	} as unknown as FranklinApp;
	const vaultRoot = toAbsolutePath('/vault');
	const configDir = '.obsidian';
	const getCreateInput = () =>
		createObsidianSessionInput(app, vaultRoot, configDir);

	render(
		<AppContext.Provider value={app}>
			<ConversationWindow getCreateInput={getCreateInput} />
		</AppContext.Provider>,
	);

	return {
		agents,
		app,
		configDir,
		defaultLLMConfig,
		getCreateInput,
		vaultRoot,
	};
}

describe('Obsidian agent tabs', () => {
	it('renders one compact tab per session with positional labels', async () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'unread'),
			createSession('session-c', 'in-progress'),
		]);

		expect(screen.getByRole('tab', { name: '1' })).toBeTruthy();
		expect(screen.getByRole('tab', { name: '2' })).toBeTruthy();
		expect(screen.getByRole('tab', { name: '3' })).toBeTruthy();

		const unreadIndicator = screen.getByTestId('agent-tab-status-session-b')
			.firstElementChild as HTMLElement;
		const idleIndicator = screen.getByTestId('agent-tab-status-session-a')
			.firstElementChild as HTMLElement;

		expect(unreadIndicator.querySelector('span')?.className).toContain(
			'bg-primary',
		);
		expect(idleIndicator.className).toContain('invisible');
	});

	it('auto-selects the last restored session when none is active yet', async () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
			createSession('session-c', 'idle'),
		]);

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '3' }).getAttribute('data-state'),
			).toBe('active');
		});
	});

	it('clicking a tab selects it and marks unread as read', async () => {
		const unreadSession = createSession('session-a', 'unread');

		renderApp([unreadSession, createSession('session-b', 'idle')]);

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '2' }).getAttribute('data-state'),
			).toBe('active');
		});

		fireEvent.click(screen.getByRole('tab', { name: '1' }));

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '1' }).getAttribute('data-state'),
			).toBe('active');
		});
		expect(unreadSession.runtime.statusStore.get()).toBe('idle');
		expect(
			screen.getByTestId('agent-tab-status-session-a').dataset.status,
		).toBe('idle');
	});

	it('clicking plus creates a new Obsidian-default session and selects it', async () => {
		const { agents, app, configDir, vaultRoot } = renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
		]);

		fireEvent.click(screen.getByRole('button', { name: 'Create agent' }));

		await waitFor(() => {
			expect(agents.create).toHaveBeenCalledTimes(1);
		});
		expect(agents.create.mock.calls[0]?.[0]).toEqual(
			createObsidianSessionInput(app, vaultRoot, configDir),
		);

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '3' }).getAttribute('data-state'),
			).toBe('active');
		});
	});

	it('deleting the active tab falls back to the previous tab', async () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
			createSession('session-c', 'idle'),
		]);

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '3' }).getAttribute('data-state'),
			).toBe('active');
		});

		fireEvent.click(screen.getByRole('button', { name: 'Delete agent 3' }));

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '2' }).getAttribute('data-state'),
			).toBe('active');
		});
	});

	it('middle-clicking a tab deletes it', async () => {
		const { agents } = renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
		]);

		fireEvent(
			screen.getByRole('tab', { name: '1' }),
			new MouseEvent('auxclick', {
				button: 1,
				bubbles: true,
				cancelable: true,
			}),
		);

		await waitFor(() => {
			expect(agents.remove).toHaveBeenCalledWith('session-a');
		});
		expect(screen.queryByRole('tab', { name: '2' })).toBeNull();
	});

	it('deleting the last tab shows the empty state and keeps plus available', async () => {
		renderApp([createSession('session-a', 'idle')]);

		await waitFor(() => {
			expect(
				screen.getByRole('tab', { name: '1' }).getAttribute('data-state'),
			).toBe('active');
		});

		fireEvent.click(screen.getByRole('button', { name: 'Delete agent 1' }));

		await waitFor(() => {
			expect(
				screen.getByText('No agents yet. Create one to start.'),
			).toBeTruthy();
		});
		expect(screen.getByRole('button', { name: 'Create agent' })).toBeTruthy();
	});
});
