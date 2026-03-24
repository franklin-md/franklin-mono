import { createContext, useContext, type ReactNode } from 'react';

import type { SessionManager } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SessionManagerContext = createContext<SessionManager | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SessionManagerProvider({
	manager,
	children,
}: {
	manager: SessionManager;
	children: ReactNode;
}) {
	return (
		<SessionManagerContext.Provider value={manager}>
			{children}
		</SessionManagerContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// useSessionManager — returns the global SessionManager instance
// ---------------------------------------------------------------------------

export function useSessionManager(): SessionManager {
	const manager = useContext(SessionManagerContext);
	if (!manager) {
		throw new Error(
			'useSessionManager must be used inside a <SessionManagerProvider>',
		);
	}
	return manager;
}
