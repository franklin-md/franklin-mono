import { useSyncExternalStore } from 'react';

import type {
	AgentSessionSnapshot,
	ReactAgentSession,
	TranscriptEntry,
} from './session-store.js';

const EMPTY_SNAPSHOT: AgentSessionSnapshot = {
	transcript: [],
};

const noopSubscribe = (_listener: () => void) => () => {};
const emptySnapshot = () => EMPTY_SNAPSHOT;

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
