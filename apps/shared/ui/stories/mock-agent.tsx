import type { ReactNode } from 'react';

import type {
	AuthEntries,
	AuthEntry,
	FranklinRuntime,
	OAuthLoginCallbacks,
} from '@franklin/agent/browser';
import type { ConversationTurn, Session } from '@franklin/extensions';
import { conversationExtension } from '@franklin/extensions';
import type { ThinkingLevel } from '@franklin/mini-acp';
import {
	AgentProvider,
	AgentsValueProvider,
	AppContext,
	type AgentsControl,
} from '@franklin/react';

import { DefaultAuthActionProvider } from '../src/auth/default-action-provider.js';

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
	const provider = opts?.provider ?? 'openai-codex';
	const model = opts?.model ?? 'gpt-5.4';

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
			provider: 'openai-codex',
			model: 'gpt-5.4',
		},
	});
	const auth = createMockAuth();

	return {
		auth,
		settings: settingsStore.store,
		agents: { list: () => [] },
		platform: {
			os: {
				openExternal: () => {},
			},
		},
	};
}

function createMockAuth() {
	let entries: AuthEntries = {};
	const listeners = new Set<
		(provider: string, entry: AuthEntry | undefined) => void
	>();

	function notify(provider: string) {
		for (const listener of listeners) {
			listener(provider, entries[provider]);
		}
	}

	return {
		entries: () => entries,
		onAuthChange: (
			listener: (provider: string, entry: AuthEntry | undefined) => void,
		) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getOAuthProviders: () => [
			{ id: 'anthropic', name: 'Anthropic' },
			{ id: 'openai-codex', name: 'ChatGPT' },
		],
		getApiKeyProviders: async () => ['openrouter'],
		loginOAuth: async (
			provider: string,
			callbacks: OAuthLoginCallbacks,
		): Promise<void> => {
			callbacks.onAuth({ url: 'https://example.com/auth' });
			entries = {
				...entries,
				[provider]: {
					...(entries[provider] ?? {}),
					oauth: {
						type: 'oauth',
						credentials: {
							access: 'mock-access-token',
							refresh: 'mock-refresh-token',
							expires: Date.now() + 60_000,
						},
					},
				},
			};
			notify(provider);
		},
		cancel: async () => {},
		removeOAuthEntry: (provider: string) => {
			const current = entries[provider];
			if (!current) return;
			const { oauth: _oauth, ...rest } = current;
			entries = {
				...entries,
				[provider]: rest,
			};
			notify(provider);
		},
		setApiKeyEntry: (provider: string, apiKey: AuthEntry['apiKey']) => {
			entries = {
				...entries,
				[provider]: {
					...(entries[provider] ?? {}),
					apiKey,
				},
			};
			notify(provider);
		},
		removeApiKeyEntry: (provider: string) => {
			const current = entries[provider];
			if (!current) return;
			const { apiKey: _apiKey, ...rest } = current;
			entries = {
				...entries,
				[provider]: rest,
			};
			notify(provider);
		},
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
			<DefaultAuthActionProvider>
				<AgentProvider agent={runtime}>
					<MockAgentsDecorator
						activeSessionId={opts.turns?.length ? 'mock-session' : null}
					>
						{children}
					</MockAgentsDecorator>
				</AgentProvider>
			</DefaultAuthActionProvider>
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
