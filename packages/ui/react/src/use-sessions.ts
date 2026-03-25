import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { Session } from '@franklin/agent/browser';

import { useSessionManager } from './session-manager-context.js';

function hasSameOrderedSessions(prev: Session[], next: Session[]): boolean {
	if (prev.length !== next.length) {
		return false;
	}

	for (let i = 0; i < prev.length; i++) {
		if (prev[i] !== next[i]) {
			return false;
		}
	}

	return true;
}

/**
 * Subscribe to the session list on the nearest `<SessionManagerProvider>`.
 *
 * Returns the current `Session[]` and re-renders only when sessions are
 * added or removed — mutations within a session (stores, history) do not
 * trigger re-renders here.
 */
export function useSessions(): Session[] {
	const manager = useSessionManager();
	const snapshotRef = useRef<Session[] | null>(null);

	const subscribe = useCallback(
		(cb: () => void) => manager.subscribe(cb),
		[manager],
	);

	// Stable Snapshots. Manager.list() returns a fresh array on every call
	// But if the elements have not changed (i.e. same set of references), we can return the previous snapshot.

	const getSnapshot = useCallback(() => {
		const next = manager.list();
		const prev = snapshotRef.current;

		// SessionManager.list() returns a fresh array on every call, even when
		// the ordered session list itself has not changed. useSyncExternalStore
		// requires getSnapshot() to reuse the previous reference in that case.
		if (prev && hasSameOrderedSessions(prev, next)) {
			return prev;
		}

		snapshotRef.current = next;
		return next;
	}, [manager]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
