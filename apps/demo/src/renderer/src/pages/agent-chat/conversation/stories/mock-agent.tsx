/**
 * Lightweight mock AgentProvider for Storybook stories.
 *
 * Provides just enough of the agent runtime for headless hooks
 * (useThinkingLevel, useModelSelection, useConversationTurns)
 * and the Prompt compound component to function.
 */
import type { ReactNode } from 'react';

import type { ConversationTurn } from '@franklin/extensions';
import type { FranklinRuntime } from '@franklin/agent/browser';
import type { ThinkingLevel } from '@franklin/mini-acp';
import { conversationExtension } from '@franklin/extensions';
import { AgentProvider } from '@franklin/react';
import { AppContext } from '@franklin/react/browser';

// ---------------------------------------------------------------------------
// createMockStore — minimal reactive store
// ---------------------------------------------------------------------------

function createMockStore<T>(initial: T) {
	let value = initial;
	const listeners = new Set<(v: T) => void>();
	return {
		ref: 'mock-ref',
		sharing: 'private' as const,
		store: {
			get: () => value,
			set: (recipe: (draft: T) => T | undefined) => {
				const result = recipe(value);
				if (result !== undefined) value = result;
				for (const l of listeners) l(value);
			},
			subscribe: (listener: (v: T) => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		},
	};
}

// ---------------------------------------------------------------------------
// createMockRuntime
// ---------------------------------------------------------------------------

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

	const stores = new Map<string, ReturnType<typeof createMockStore>>();
	stores.set(
		conversationKey,
		conversationStore as ReturnType<typeof createMockStore>,
	);

	return {
		state: async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { reasoning, provider, model },
			},
		}),
		setContext: async () => {},
		subscribe: () => () => {},
		prompt: async function* () {},
		cancel: async () => {},
		dispose: async () => {},
		fork: async () => ({}),
		child: async () => ({}),
		stores: {
			get: (name: string) => stores.get(name),
			has: (name: string) => stores.has(name),
		},
		environment: {},
	} as unknown as FranklinRuntime;
}

// ---------------------------------------------------------------------------
// createMockApp — minimal FranklinApp for AppContext
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// MockAgentDecorator
// ---------------------------------------------------------------------------

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
			<AgentProvider agent={runtime}>{children}</AgentProvider>
		</AppContext.Provider>
	);
}
