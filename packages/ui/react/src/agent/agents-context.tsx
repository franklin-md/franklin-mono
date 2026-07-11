import type { ReactNode } from 'react';

import { createSimpleContext } from '../utils/create-simple-context.js';
import {
	useAgentList,
	type AgentCreate,
	type AgentCreateInput,
	type AgentListOptions,
	type AgentsControl,
} from './use-agent-list.js';

const [AgentsValueProvider, useAgents] =
	createSimpleContext<AgentsControl>('Agents');

export { useAgents };
export type { AgentCreate, AgentCreateInput, AgentListOptions, AgentsControl };

/** @internal exported for test wrappers and Storybook decorators. */
export { AgentsValueProvider };

/**
 * Provides agent-list state and actions to the subtree.
 *
 * Must be rendered inside `<HarnessProvider>`. Both the sidebar
 * (agent list) and the active-agent content area should live under
 * this provider so they share a single selection state.
 */
export type AgentsProviderProps = AgentListOptions & {
	children: ReactNode;
};

export function AgentsProvider({
	children,
	includeHiddenSessions,
}: AgentsProviderProps) {
	const control = useAgentList({ includeHiddenSessions });
	return <AgentsValueProvider value={control}>{children}</AgentsValueProvider>;
}
