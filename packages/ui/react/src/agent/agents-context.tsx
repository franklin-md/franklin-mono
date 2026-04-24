import type { ReactNode } from 'react';

import { createSimpleContext } from '../utils/create-simple-context.js';
import {
	useAgentList,
	type AgentCreate,
	type AgentCreateInput,
	type AgentsControl,
} from './use-agent-list.js';

const [AgentsProviderInner, useAgents] =
	createSimpleContext<AgentsControl>('Agents');

export { useAgents };
export type { AgentCreate, AgentCreateInput, AgentsControl };

/**
 * Provides agent-list state and actions to the subtree.
 *
 * Must be rendered inside `<FranklinProvider>`. Both the sidebar
 * (agent list) and the active-agent content area should live under
 * this provider so they share a single selection state.
 */
export function AgentsProvider({ children }: { children: ReactNode }) {
	const control = useAgentList();
	return <AgentsProviderInner value={control}>{children}</AgentsProviderInner>;
}
