import type {
	AgentStack,
	RequestPermissionResponse,
	SessionNotification,
} from '@franklin/agent';

export interface TranscriptEntry {
	id: string;
	receivedAt: number;
	notification: SessionNotification;
}

export interface AgentSessionSnapshot {
	transcript: readonly TranscriptEntry[];
}

export interface AgentSessionStore {
	subscribe(listener: () => void): () => void;
	getSnapshot(): AgentSessionSnapshot;
}

export interface ReactAgentSession {
	stack: AgentStack;
	sessionId: string;
	store: AgentSessionStore;
}

const EMPTY_SNAPSHOT: AgentSessionSnapshot = {
	transcript: [],
};

export function createSessionStore(): {
	store: AgentSessionStore;
	handler: Pick<AgentStack, 'requestPermission' | 'sessionUpdate'>;
} {
	const listeners = new Set<() => void>();
	let snapshot = EMPTY_SNAPSHOT;
	let nextId = 0;

	function emit(nextTranscript: readonly TranscriptEntry[]): void {
		snapshot = { transcript: nextTranscript };
		for (const listener of listeners) {
			listener();
		}
	}

	function selectPermissionOption(
		options: ReadonlyArray<{
			kind: string;
			optionId: string;
		}>,
	): string {
		return (
			options.find((option) => option.kind === 'reject_once')?.optionId ??
			options.find((option) => option.kind === 'reject_always')?.optionId ??
			options[0]?.optionId ??
			''
		);
	}

	return {
		store: {
			subscribe: (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
			getSnapshot: () => snapshot,
		},
		handler: {
			sessionUpdate: async (notification) => {
				emit([
					...snapshot.transcript,
					{
						id: `entry-${nextId++}`,
						receivedAt: Date.now(),
						notification,
					},
				]);
			},
			requestPermission: async (request) => {
				console.warn('Auto-rejecting ACP permission request', request);
				const optionId = selectPermissionOption(request.options);
				if (!optionId) {
					throw new Error('Permission request contained no selectable options');
				}
				return {
					outcome: { outcome: 'selected', optionId },
				} satisfies RequestPermissionResponse;
			},
		},
	};
}
