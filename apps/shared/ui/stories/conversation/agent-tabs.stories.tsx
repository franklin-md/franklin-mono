import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, type ReactNode } from 'react';

import type { FranklinApp, FranklinRuntime } from '@franklin/agent/browser';
import { statusExtension, type StatusState } from '@franklin/extensions';
import type { Session } from '@franklin/extensions';
import { AgentsProvider, AppContext } from '@franklin/react';

import { AgentTabs } from '../../src/agent-tabs/tabs.js';

type Listener<T> = (value: T) => void;

type SessionSeed = {
	id: string;
	status: StatusState;
};

function createStore<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener<T>>();

	return {
		get: () => value,
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

function createRuntime(status: StatusState): FranklinRuntime {
	const statusStore = createStore<StatusState>(status);
	return {
		getStore(name: string) {
			if (name !== statusExtension.keys.status) {
				throw new Error(`Unknown store: ${name}`);
			}

			return statusStore;
		},
	} as unknown as FranklinRuntime;
}

function createSession(
	id: string,
	status: StatusState,
): Session<FranklinRuntime> {
	return { id, runtime: createRuntime(status) };
}

type MockAgentsHostProps = {
	initialSessions: SessionSeed[];
	children: ReactNode;
};

function MockAgentsHost({ initialSessions, children }: MockAgentsHostProps) {
	const app = useMemo(() => {
		const sessions: Session<FranklinRuntime>[] = initialSessions.map((seed) =>
			createSession(seed.id, seed.status),
		);
		const listeners = new Set<() => void>();
		let nextIndex = sessions.length + 1;

		function notify() {
			for (const listener of listeners) {
				listener();
			}
		}

		return {
			agents: {
				create: async () => {
					const session = createSession(`session-${nextIndex++}`, 'idle');
					sessions.push(session);
					notify();
					return session;
				},
				get: (id: string) => sessions.find((session) => session.id === id),
				list: () => [...sessions],
				remove: async (id: string) => {
					const index = sessions.findIndex((session) => session.id === id);
					if (index === -1) {
						return false;
					}

					sessions.splice(index, 1);
					notify();
					return true;
				},
				subscribe: (listener: () => void) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
			},
			auth: { entries: () => ({}) },
			settings: {
				get: () => ({
					defaultLLMConfig: {
						provider: 'openai-codex',
						model: 'gpt-5.4',
						reasoning: 'medium' as const,
					},
				}),
			},
		} as unknown as FranklinApp;
	}, [initialSessions]);

	return (
		<AppContext.Provider value={app}>
			<AgentsProvider>{children}</AgentsProvider>
		</AppContext.Provider>
	);
}

const meta = {
	title: 'Conversation/AgentTabs',
	component: AgentTabs,
	parameters: {
		layout: 'padded',
	},
	decorators: [
		(Story, ctx) => {
			const initialSessions =
				(ctx.parameters['initialSessions'] as SessionSeed[] | undefined) ?? [];
			return (
				<MockAgentsHost initialSessions={initialSessions}>
					<div className="flex w-full flex-col bg-background text-foreground">
						<Story />
					</div>
				</MockAgentsHost>
			);
		},
	],
} satisfies Meta<typeof AgentTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	parameters: {
		initialSessions: [] satisfies SessionSeed[],
	},
};

export const SingleAgent: Story = {
	parameters: {
		initialSessions: [
			{ id: 'session-a', status: 'idle' },
		] satisfies SessionSeed[],
	},
};

export const MultipleAgents: Story = {
	parameters: {
		initialSessions: [
			{ id: 'session-a', status: 'idle' },
			{ id: 'session-b', status: 'unread' },
			{ id: 'session-c', status: 'in-progress' },
		] satisfies SessionSeed[],
	},
};

export const ManyAgentsOverflow: Story = {
	parameters: {
		initialSessions: Array.from({ length: 12 }, (_, index) => ({
			id: `session-${index + 1}`,
			status: (['idle', 'unread', 'in-progress'][index % 3] ??
				'idle') as StatusState,
		})) satisfies SessionSeed[],
	},
};
