import { createContext, useContext, useRef, type ReactNode } from 'react';

import type { Agent, ExtensionStores } from '@franklin/agent/browser';
import type { Extension } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Holds the agent in a ref-like wrapper so the context value identity
 * never changes. Consuming components that only call `useAgent()` will
 * never re-render due to context alone.
 */
interface AgentRef {
	current: Agent<Extension<any>[]> | null;
}

const AgentContext = createContext<AgentRef>({ current: null });

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AgentProvider<E extends readonly Extension<any>[]>({
	agent,
	children,
}: {
	agent: Agent<E>;
	children: ReactNode;
}) {
	// Stable ref object — identity never changes across renders,
	// so downstream consumers of the context don't re-render.
	const ref = useRef<AgentRef>({ current: null });
	ref.current.current = agent as Agent<Extension<any>[]>;

	return (
		<AgentContext.Provider value={ref.current}>
			{children}
		</AgentContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// useAgent — commands only, never re-renders
// ---------------------------------------------------------------------------

/**
 * Returns the agent from the nearest `<AgentProvider>`.
 *
 * This hook **never triggers re-renders** — it reads a stable ref.
 * Use it for commands (`agent.prompt`, `agent.cancel`, etc.) and to
 * pass the agent into `useAgentState` for reactive store access.
 */
export function useAgent<E extends readonly Extension<any>[]>(): Agent<E> {
	const ref = useContext(AgentContext);
	if (!ref.current) {
		throw new Error('useAgent must be used inside an <AgentProvider>');
	}
	return ref.current as Agent<E>;
}

// ---------------------------------------------------------------------------
// useAgentState — subscribe to a single store, re-render only for that store
// ---------------------------------------------------------------------------

export type { ExtensionStores };
