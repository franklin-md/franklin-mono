import { createContext, useContext, type ReactNode } from 'react';

import type { Agent } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Stores the agent directly (not in a ref). When the selected agent changes
 * (e.g. switching agents in a sidebar), the context value changes and all
 * consumers re-render — which is the desired behavior. Store subscriptions
 * in useAgentState are independent of the context and do NOT cause re-renders
 * here.
 */
const AgentContext = createContext<Agent | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AgentProvider({
	agent,
	children,
}: {
	agent: Agent;
	children: ReactNode;
}) {
	return (
		<AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// useAgent — returns the agent for commands, re-renders only on agent switch
// ---------------------------------------------------------------------------

/**
 * Returns the agent from the nearest `<AgentProvider>`.
 *
 * Re-renders only when the agent instance itself changes (e.g. selecting
 * a different agent). Store updates within the same agent do NOT trigger
 * re-renders — use `useAgentState(agent, storeName)` for reactive store reads.
 */
export function useAgent(): Agent {
	const agent = useContext(AgentContext);
	if (!agent) {
		throw new Error('useAgent must be used inside an <AgentProvider>');
	}
	return agent;
}
