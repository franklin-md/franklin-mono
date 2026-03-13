import { useSyncExternalStore } from 'react';

import type { AgentManager, ManagedSession } from './agent-manager.js';
import type {
	AgentSessionSnapshot,
	ReactAgentSession,
	TranscriptEntry,
} from './session-store.js';

const EMPTY_SNAPSHOT: AgentSessionSnapshot = {
	transcript: [],
};

const EMPTY_SESSIONS: readonly ManagedSession[] = [];

const noopSubscribe = (_listener: () => void) => () => {};
const emptySnapshot = () => EMPTY_SNAPSHOT;
const emptySessions = () => EMPTY_SESSIONS;

export function useSessionSnapshot(
	session: ReactAgentSession | undefined,
): AgentSessionSnapshot {
	return useSyncExternalStore(
		session ? (listener) => session.store.subscribe(listener) : noopSubscribe,
		session ? () => session.store.getSnapshot() : emptySnapshot,
	);
}

export function useTranscript(
	session: ReactAgentSession | undefined,
): readonly TranscriptEntry[] {
	return useSessionSnapshot(session).transcript;
}

export function useAgentManager(
	manager: AgentManager | undefined,
): readonly ManagedSession[] {
	return useSyncExternalStore(
		manager ? manager.subscribe : noopSubscribe,
		manager ? manager.getSnapshot : emptySessions,
	);
}
