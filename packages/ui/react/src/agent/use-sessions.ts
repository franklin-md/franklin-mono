import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';

import { useApp } from './franklin-context.js';

function sameRuntimes(
	prev: FranklinRuntime[],
	next: FranklinRuntime[],
): boolean {
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
 * Subscribe to the session list on the nearest `<FranklinProvider>`.
 *
 * Returns the current `Session[]` and re-renders only when sessions are
 * added or removed — mutations within a session (stores, history) do not
 * trigger re-renders here.
 */
export function useSessions(): FranklinRuntime[] {
	const manager = useApp().agents;
	const snapshotRef = useRef<FranklinRuntime[] | null>(null);

	const subscribe = useCallback(
		(cb: () => void) => manager.subscribe(cb),
		[manager],
	);

	const getSnapshot = useCallback(() => {
		const next = manager.list().map((session) => session.runtime);
		const prev = snapshotRef.current;

		// agents.list() returns a fresh array on every call. Reuse the previous
		// snapshot when the runtime references are stable.
		if (prev && sameRuntimes(prev, next)) {
			return prev;
		}

		snapshotRef.current = next;
		return next;
	}, [manager]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
