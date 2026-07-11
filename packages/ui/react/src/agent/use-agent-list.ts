import { useCallback } from 'react';

import type {
	FranklinRuntime,
	FranklinState,
	OrchestratorCreateInput,
	RuntimeEntry,
} from '@franklin/agent';

import { useHarness } from './harness-context.js';
import {
	type AgentListOptions,
	isVisibleSession,
	useAgentListSessions,
} from './use-agent-list-sessions.js';
import { useCollectionNavigator } from '../utils/use-collection-navigator.js';

export type { AgentListOptions };
export type AgentCreateInput = OrchestratorCreateInput<FranklinState>;
export type AgentCreate = (
	input?: AgentCreateInput,
) => Promise<RuntimeEntry<FranklinRuntime>>;

export type AgentsControl = {
	sessions: RuntimeEntry<FranklinRuntime>[];
	activeSessionId: string | null;
	activeSession: RuntimeEntry<FranklinRuntime> | undefined;
	select: (id: string) => void;
	create: AgentCreate;
	remove: (id: string) => void;
};

function getSessionKey(session: RuntimeEntry<FranklinRuntime>): string {
	return session.details.id;
}

/**
 * Headless controller for agent-list state and actions.
 *
 * Composes the visible session list with local active-session tracking
 * and exposes imperative `select`, `create`, and `remove` actions.
 *
 * Fallback on delete: selects the previous agent in the list, or the
 * first if the deleted agent was first, or clears if none remain.
 */
export function useAgentList({
	includeHiddenSessions = false,
}: AgentListOptions = {}): AgentsControl {
	const manager = useHarness().agents;
	const sessions = useAgentListSessions({ includeHiddenSessions });
	const {
		currentItem: activeSession,
		currentKey,
		navigateToKey,
		navigateToItem,
		removeEntry,
	} = useCollectionNavigator(sessions, getSessionKey, {
		initialPosition: 'last',
		removeEntry: (id) => manager.remove(id),
	});
	const activeSessionId = currentKey ?? null;

	const create = useCallback(
		async (input?: AgentCreateInput) => {
			const session = await manager.create(input);
			if (includeHiddenSessions || isVisibleSession(session)) {
				navigateToKey(session.details.id);
			}
			return session;
		},
		[includeHiddenSessions, manager, navigateToKey],
	);

	return {
		sessions,
		activeSessionId,
		activeSession,
		select: navigateToItem,
		create,
		remove: removeEntry,
	};
}
