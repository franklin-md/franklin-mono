import { useCallback } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import type { RuntimeEntry } from '@franklin/extensions';

import { useApp } from './franklin-context.js';
import { useStableExternalStore } from '../utils/use-stable-external-store.js';

function sameSessions(
	prev: RuntimeEntry<FranklinRuntime>[],
	next: RuntimeEntry<FranklinRuntime>[],
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
 * Subscribe to the runtime-entry list on the nearest `<FranklinProvider>`.
 *
 * Returns the current `RuntimeEntry[]` and re-renders only when entries are
 * added or removed — mutations within a runtime (stores, history) do not
 * trigger re-renders here.
 */
export function useSessions(): RuntimeEntry<FranklinRuntime>[] {
	const manager = useApp().agents;

	const subscribe = useCallback(
		(cb: () => void) => manager.subscribe(cb),
		[manager],
	);

	const getSnapshot = useCallback(() => manager.list(), [manager]);

	return useStableExternalStore(subscribe, getSnapshot, sameSessions);
}
