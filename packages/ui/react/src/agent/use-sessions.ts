import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { Session } from '@franklin/extensions';

import { useApp } from './franklin-context.js';

function sameSessions(
	prev: Session<FranklinRuntime>[],
	next: Session<FranklinRuntime>[],
): boolean {
	if (prev.length !== next.length) {
		return false;
	}

	for (let i = 0; i < prev.length; i++) {
		const p = prev[i];
		const n = next[i];
		if (p?.id !== n?.id || p?.runtime !== n?.runtime) {
			return false;
		}
	}

	return true;
}

/**
 * Subscribe to the session list on the nearest `<FranklinProvider>`.
 *
 * Returns the current `Session[]` and re-renders only when sessions are
 * added or removed — mutations within a session (stores, history) do not
 * trigger re-renders here.
 */
export function useSessions(): Session<FranklinRuntime>[] {
	const manager = useApp().agents;
	const snapshotRef = useRef<Session<FranklinRuntime>[] | null>(null);

	const subscribe = useCallback(
		(cb: () => void) => manager.subscribe(cb),
		[manager],
	);

	const getSnapshot = useCallback(() => {
		const next = manager.list();
		const prev = snapshotRef.current;

		// agents.list() returns a fresh array on every call. Reuse the previous
		// snapshot when the runtime references are stable.
		if (prev && sameSessions(prev, next)) {
			return prev;
		}

		snapshotRef.current = next;
		return next;
	}, [manager]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
