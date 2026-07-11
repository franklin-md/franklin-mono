import { useMemo } from 'react';

import type { FranklinRuntime, RuntimeEntry } from '@franklin/agent';

import { useSessions } from './use-sessions.js';

export type AgentListOptions = {
	readonly includeHiddenSessions?: boolean;
};

export function isVisibleSession(
	session: RuntimeEntry<FranklinRuntime>,
): boolean {
	return session.details.visibility === 'visible';
}

export function useAgentListSessions({
	includeHiddenSessions = false,
}: AgentListOptions = {}): RuntimeEntry<FranklinRuntime>[] {
	const sessions = useSessions();

	return useMemo(() => {
		if (includeHiddenSessions) {
			return sessions;
		}

		return sessions.filter(isVisibleSession);
	}, [includeHiddenSessions, sessions]);
}
