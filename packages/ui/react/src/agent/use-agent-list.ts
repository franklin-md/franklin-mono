import { useCallback, useMemo, useState } from 'react';

import type { Agents, FranklinRuntime } from '@franklin/agent/browser';
import type { RuntimeBase, Session } from '@franklin/extensions';

import { useApp } from './franklin-context.js';
import { useSessions } from './use-sessions.js';

export type AgentsControl<RT extends RuntimeBase<any> = FranklinRuntime> = {
	sessions: Session<RT>[];
	activeSessionId: string | null;
	activeSession: Session<RT> | undefined;
	select: (id: string) => void;
	create: (...args: Parameters<Agents['create']>) => Promise<Session<RT>>;
	remove: (id: string) => void;
};

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
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

	const activeSession = useMemo(
		() => sessions.find((s) => s.id === activeSessionId),
		[sessions, activeSessionId],
	);

	const select = useCallback((id: string) => {
		setActiveSessionId(id);
	}, []);

	const create = useCallback(
		async (...args: Parameters<Agents['create']>) => {
			const session = await manager.create(...args);
			setActiveSessionId(session.id);
			return session;
		},
		[manager],
	);

	const remove = useCallback(
		(id: string) => {
			const idx = sessions.findIndex((s) => s.id === id);
			void manager.remove(id);

			if (activeSessionId === id) {
				const remaining = sessions.filter((s) => s.id !== id);
				// TODO: improve fallback using click history — pop the last
				// selected session from a visited-sessions stack that is still valid.
				const prevIdx = Math.max(0, idx - 1);
				const next = remaining[prevIdx];
				setActiveSessionId(next ? next.id : null);
			}
		},
		[manager, activeSessionId, sessions],
	);

	return { sessions, activeSessionId, activeSession, select, create, remove };
}
