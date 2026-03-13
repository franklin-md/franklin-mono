import { useSyncExternalStore } from 'react';

import type { AgentStore, AgentStoreSnapshot } from '../lib/agent-store.js';

const EMPTY_SNAPSHOT: AgentStoreSnapshot = {
	status: 'idle',
	items: [],
	pendingPermission: null,
};

const noopSubscribe = (_listener: () => void) => () => {};
const emptySnapshot = () => EMPTY_SNAPSHOT;

export function useAgentStore(
	store: AgentStore | undefined,
): AgentStoreSnapshot {
	return useSyncExternalStore(
		store ? (listener) => store.subscribe(listener) : noopSubscribe,
		store ? () => store.snapshot : emptySnapshot,
	);
}
