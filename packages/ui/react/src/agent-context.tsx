import type { SessionRuntime } from '@franklin/agent/browser';

import { createSimpleContext } from './create-simple-context.js';

/**
 * Stores the runtime directly (not in a ref). When the selected runtime changes
 * (e.g. switching sessions in a sidebar), the context value changes and all
 * consumers re-render — which is the desired behavior. Store subscriptions
 * in useAgentState are independent of the context and do NOT cause re-renders
 * here.
 */
const [AgentProviderInner, useAgent] =
	createSimpleContext<SessionRuntime>('Agent');

/**
 * Returns the session runtime from the nearest `<AgentProvider>`.
 *
 * Re-renders only when the runtime instance itself changes (e.g. selecting
 * a different session). Store updates within the same session do NOT trigger
 * re-renders — use `useAgentState(agent, storeName)` for reactive store reads.
 */
export { useAgent };

export function AgentProvider({
	agent,
	children,
}: {
	agent: SessionRuntime;
	children: React.ReactNode;
}) {
	return <AgentProviderInner value={agent}>{children}</AgentProviderInner>;
}
