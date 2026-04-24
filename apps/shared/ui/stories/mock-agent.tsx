import type { ReactNode } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { ConversationTurn, Session } from '@franklin/extensions';
import { conversationExtension } from '@franklin/extensions';
import type { ThinkingLevel } from '@franklin/mini-acp';
import {
	AgentProvider,
	AgentsValueProvider,
	AppContext,
	type AgentsControl,
} from '@franklin/react';

function createMockStore<T>(initial: T) {
	let value = initial;
	const listeners = new Set<(next: T) => void>();

	return {
		ref: 'mock-ref',
		sharing: 'private' as const,
		store: {
			get: () => value,
			set: (recipe: (draft: T) => T | undefined) => {
				const result = recipe(value);
				if (result !== undefined) {
					value = result;
				}

				for (const listener of listeners) {
					listener(value);
				}
			},
			subscribe: (listener: (next: T) => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		},
	};
}

export function createMockRuntime(opts?: {
	turns?: ConversationTurn[];
	reasoning?: ThinkingLevel;
	provider?: string;
	model?: string;
}): FranklinRuntime {
	const reasoning = opts?.reasoning ?? 'medium';
	const provider = opts?.provider ?? 'anthropic';
	const model = opts?.model ?? 'claude-sonnet-4-6';

	const conversationKey = conversationExtension.keys.conversation;
	const conversationStore = createMockStore(opts?.turns ?? []);

	const storeEntries = new Map<string, ReturnType<typeof createMockStore>>();
	storeEntries.set(
		conversationKey,
		conversationStore as ReturnType<typeof createMockStore>,
	);

	return {
		state: async () => ({
			core: {
				messages: [],
				llmConfig: { reasoning, provider, model },
			},
		}),
		subscribe: () => () => {},
		prompt: async function* () {},
		cancel: async () => {},
		dispose: async () => {},
		fork: async () => ({}),
		child: async () => ({}),
		getStore: (name: string) => {
			const entry = storeEntries.get(name);
			if (!entry) throw new Error(`No mock store "${name}"`);
			return entry.store;
		},
		environment: {},
	} as unknown as FranklinRuntime;
}

function createMockApp() {
	const settingsStore = createMockStore({
		defaultLLMConfig: {
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
		},
	});

	return {
		settings: settingsStore.store,
		agents: { list: () => [] },
	};
}

export function MockAgentDecorator({
	children,
	...opts
}: {
	children: ReactNode;
	turns?: ConversationTurn[];
	reasoning?: ThinkingLevel;
	provider?: string;
	model?: string;
}) {
	const runtime = createMockRuntime(opts);
	const app = createMockApp();

	return (
		<AppContext.Provider value={app as never}>
			<AgentProvider agent={runtime}>
				<MockAgentsDecorator
					activeSessionId={opts.turns?.length ? 'mock-session' : null}
				>
					{children}
				</MockAgentsDecorator>
			</AgentProvider>
		</AppContext.Provider>
	);
}

export function MockAgentsDecorator({
	children,
	activeSessionId = null,
}: {
	children: ReactNode;
	activeSessionId?: string | null;
}) {
	const control = {
		sessions: [],
		activeSessionId,
		activeSession: undefined,
		select: () => {},
		create: async () =>
			({
				id: 'mock-forked',
				runtime: {} as FranklinRuntime,
			}) satisfies Session<FranklinRuntime>,
		remove: () => {},
	} satisfies AgentsControl;

	return <AgentsValueProvider value={control}>{children}</AgentsValueProvider>;
}
