import { useCallback } from 'react';

import type {
	FranklinRuntime,
	FranklinState,
	OrchestratorCreateInput,
	RuntimeEntry,
} from '@franklin/agent';

import { useApp } from './franklin-context.js';
import { useSessions } from './use-sessions.js';
import { useCollectionNavigator } from '../utils/use-collection-navigator.js';

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
	return session.id;
}

/**
 * Headless controller for agent-list state and actions.
 *
 * Composes `useSessions()` with local active-session tracking and
 * exposes imperative `select`, `create`, and `remove` actions.
 *
 * Fallback on delete: selects the previous agent in the list, or the
 * first if the deleted agent was first, or clears if none remain.
 */
export function useAgentList(): AgentsControl {
	const manager = useApp().agents;
	const sessions = useSessions();
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
			navigateToKey(session.id);
			return session;
		},
		[manager, navigateToKey],
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
