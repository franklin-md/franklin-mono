// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	FranklinApp,
	FranklinRuntime,
	RuntimeEntry,
} from '@franklin/agent';
import {
	conversationTitleExtension,
	statusExtension,
	type StatusState,
} from '@franklin/agent';
import { toAbsolutePath } from '@franklin/lib';
import type { AgentCreateInput } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';

import { createObsidianSessionInput } from '../../app/agent.js';
import { ConversationWindow } from '../conversation-window/window.js';

vi.mock('../conversation.js', () => ({
	ConversationPanel() {
		return <div data-testid="conversation-panel" />;
	},
}));

vi.mock('../conversation-window/viewing-context/sync.js', () => ({
	ViewingContextSync() {
		return null;
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
	titleStore: ReturnType<typeof createStore<string>>;
};

type TestSession = RuntimeEntry<FranklinRuntime> & { runtime: TestRuntime };
type Visibility = RuntimeEntry<FranklinRuntime>['details']['visibility'];

function createRuntime(status: StatusState, title = ''): TestRuntime {
	const statusStore = createStore(status);
	const titleStore = createStore(title);

	return {
		statusStore,
		titleStore,
		getStore(name: string) {
			if (name === statusExtension.keys.status) {
				return statusStore;
			}
			if (name === conversationTitleExtension.keys.title) {
				return titleStore;
			}
			throw new Error(`Unknown store: ${name}`);
		},
	} as TestRuntime;
}

function createSession(
	id: string,
	status: StatusState,
	title?: string,
	visibility: Visibility = 'visible',
): TestSession {
	return {
		details: { id, visibility },
		runtime: createRuntime(status, title),
	};
}

function getSessionTab(sessionId: string): HTMLElement {
	return within(screen.getByTestId(`agent-tab-${sessionId}`)).getByRole('tab');
}

function getSessionDeleteButton(sessionId: string): HTMLElement {
	return within(screen.getByTestId(`agent-tab-${sessionId}`)).getByRole(
		'button',
	);
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
		get: vi.fn((id: string) =>
			sessions.find((session) => session.details.id === id),
		),
		list: vi.fn(() => [...sessions]),
		remove: vi.fn(async (id: string) => {
			const index = sessions.findIndex((session) => session.details.id === id);
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
		<ApplicationProvider harness={app} hostActionBindings={[]}>
			<ConversationWindow getCreateInput={getCreateInput} />
		</ApplicationProvider>,
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
	it('omits the standalone Franklin header and auth button', () => {
		renderApp([]);

		expect(screen.queryByText('Franklin')).toBeNull();
		expect(screen.queryByText('Obsidian agent window')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
	});

	it('renders one compact tab per session with new-chat labels', async () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'unread'),
			createSession('session-c', 'in-progress'),
		]);

		expect(getSessionTab('session-a').textContent).toContain('New chat');
		expect(getSessionTab('session-b').textContent).toContain('New chat');
		expect(getSessionTab('session-c').textContent).toContain('New chat');
		expect(getSessionTab('session-a').className).toContain('px-1.5');
		expect(screen.getByRole('tab', { name: 'New chat 1' })).toBeTruthy();
		expect(screen.getByRole('tab', { name: 'New chat 2' })).toBeTruthy();
		expect(screen.getByRole('tab', { name: 'New chat 3' })).toBeTruthy();

		const unreadIndicator = screen.getByTestId('agent-tab-status-session-b')
			.firstElementChild as HTMLElement;
		const idleIndicator = screen.getByTestId('agent-tab-status-session-a')
			.firstElementChild as HTMLElement;

		expect(unreadIndicator.querySelector('span')?.className).toContain(
			'bg-primary',
		);
		expect(idleIndicator.className).toContain('invisible');
	});

	it('renders compact tabs for visible sessions only', () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-hidden', 'idle', undefined, 'hidden'),
			createSession('session-c', 'idle'),
		]);

		expect(getSessionTab('session-a')).toBeTruthy();
		expect(screen.queryByTestId('agent-tab-session-hidden')).toBeNull();
		expect(getSessionTab('session-c')).toBeTruthy();
		expect(screen.getByRole('tab', { name: 'New chat 1' })).toBeTruthy();
		expect(screen.getByRole('tab', { name: 'New chat 2' })).toBeTruthy();
		expect(screen.queryByRole('tab', { name: 'New chat 3' })).toBeNull();
	});

	it('uses chat titles for named sessions and muted new-chat labels as the fallback', async () => {
		renderApp([
			createSession('session-a', 'idle', 'Inbox triage'),
			createSession('session-b', 'idle'),
		]);

		expect(screen.getByRole('tab', { name: 'Inbox triage' })).toBeTruthy();
		const placeholder = screen.getByRole('tab', { name: 'New chat 2' });
		expect(placeholder).toBeTruthy();
		expect(
			within(screen.getByTestId('agent-tab-session-b')).getByText('New chat')
				.className,
		).toContain('text-muted-foreground');
		expect(
			screen.getByRole('button', { name: 'Delete agent Inbox triage' }),
		).toBeTruthy();
		expect(
			screen.getByRole('button', { name: 'Delete agent New chat 2' }),
		).toBeTruthy();
	});

	it('auto-selects the last restored session when none is active yet', async () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
			createSession('session-c', 'idle'),
		]);

		await waitFor(() => {
			expect(getSessionTab('session-c').getAttribute('data-state')).toBe(
				'active',
			);
		});
	});

	it('clicking a tab selects it and marks unread as read', async () => {
		const unreadSession = createSession('session-a', 'unread');

		renderApp([unreadSession, createSession('session-b', 'idle')]);

		await waitFor(() => {
			expect(getSessionTab('session-b').getAttribute('data-state')).toBe(
				'active',
			);
		});

		fireEvent.click(getSessionTab('session-a'));

		await waitFor(() => {
			expect(getSessionTab('session-a').getAttribute('data-state')).toBe(
				'active',
			);
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
			expect(getSessionTab('session-3').getAttribute('data-state')).toBe(
				'active',
			);
		});
	});

	it('deleting the active tab falls back to the previous tab', async () => {
		renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
			createSession('session-c', 'idle'),
		]);

		await waitFor(() => {
			expect(getSessionTab('session-c').getAttribute('data-state')).toBe(
				'active',
			);
		});

		fireEvent.click(getSessionDeleteButton('session-c'));

		await waitFor(() => {
			expect(getSessionTab('session-b').getAttribute('data-state')).toBe(
				'active',
			);
		});
	});

	it('middle-clicking a tab deletes it', async () => {
		const { agents } = renderApp([
			createSession('session-a', 'idle'),
			createSession('session-b', 'idle'),
		]);

		fireEvent(
			getSessionTab('session-a'),
			new MouseEvent('auxclick', {
				button: 1,
				bubbles: true,
				cancelable: true,
			}),
		);

		await waitFor(() => {
			expect(agents.remove).toHaveBeenCalledWith('session-a');
		});
		expect(screen.queryByTestId('agent-tab-session-a')).toBeNull();
		expect(getSessionTab('session-b')).toBeTruthy();
	});

	it('deleting the last tab shows the empty state and keeps plus available', async () => {
		renderApp([createSession('session-a', 'idle')]);

		await waitFor(() => {
			expect(getSessionTab('session-a').getAttribute('data-state')).toBe(
				'active',
			);
		});

		fireEvent.click(getSessionDeleteButton('session-a'));

		await waitFor(() => {
			expect(
				screen.getByText('No agents yet. Create one to start.'),
			).toBeTruthy();
		});
		expect(screen.getByRole('button', { name: 'Create agent' })).toBeTruthy();
	});
});
