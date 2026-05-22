import { useMemo } from 'react';

import type { FranklinRuntime, RuntimeEntry } from '@franklin/agent';

import { useSessions } from './use-sessions.js';

export function isVisibleSession(
	session: RuntimeEntry<FranklinRuntime>,
): boolean {
	return session.details.visibility === 'visible';
}

export function useVisibleSessions(): RuntimeEntry<FranklinRuntime>[] {
	const sessions = useSessions();

	return useMemo(() => sessions.filter(isVisibleSession), [sessions]);
}
