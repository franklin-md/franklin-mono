import type { Agent } from '@franklin/agent/browser';

import { createSimpleContext } from './create-simple-context.js';

/**
 * Stores the agent directly (not in a ref). When the selected agent changes
 * (e.g. switching agents in a sidebar), the context value changes and all
 * consumers re-render — which is the desired behavior. Store subscriptions
 * in useAgentState are independent of the context and do NOT cause re-renders
 * here.
 */
const [AgentProviderInner, useAgent] = createSimpleContext<Agent>('Agent');

/**
 * Returns the agent from the nearest `<AgentProvider>`.
 *
 * Re-renders only when the agent instance itself changes (e.g. selecting
 * a different agent). Store updates within the same agent do NOT trigger
 * re-renders — use `useAgentState(agent, storeName)` for reactive store reads.
 */
export { useAgent };

export function AgentProvider({
	agent,
	children,
}: {
	agent: Agent;
	children: React.ReactNode;
}) {
	return <AgentProviderInner value={agent}>{children}</AgentProviderInner>;
}
