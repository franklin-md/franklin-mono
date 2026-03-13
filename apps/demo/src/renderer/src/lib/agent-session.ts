import { AgentConnection, compose, PROTOCOL_VERSION } from '@franklin/agent';
import type {
	AgentStack,
	RequestPermissionResponse,
	SessionNotification,
} from '@franklin/agent';

import { createIpcTransport } from './ipc-transport.js';

// ---------------------------------------------------------------------------
// Session store (inlined from @franklin/react-agents to avoid pulling in
// Node.js transitive deps through the react-agents barrel)
// ---------------------------------------------------------------------------

export interface TranscriptEntry {
	id: string;
	receivedAt: number;
	notification: SessionNotification;
}

export interface SessionSnapshot {
	transcript: readonly TranscriptEntry[];
}

export interface SessionStore {
	subscribe(listener: () => void): () => void;
	getSnapshot(): SessionSnapshot;
}

const EMPTY_SNAPSHOT: SessionSnapshot = { transcript: [] };

function createSessionStore(): {
	store: SessionStore;
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
				console.warn('Auto-rejecting permission request', request);
				const optionId =
					request.options.find((o) => o.kind === 'reject_once')?.optionId ??
					request.options.find((o) => o.kind === 'reject_always')?.optionId ??
					request.options[0]?.optionId ??
					'';
				if (!optionId) {
					throw new Error('No selectable permission option');
				}
				return {
					outcome: { outcome: 'selected', optionId },
				} satisfies RequestPermissionResponse;
			},
		},
	};
}

// ---------------------------------------------------------------------------
// Agent session — full ACP lifecycle in the renderer
// ---------------------------------------------------------------------------

export interface DemoAgentSession {
	agentId: string;
	agentName: string;
	sessionId: string;
	stack: AgentStack;
	store: SessionStore;
	dispose(): Promise<void>;
}

/**
 * Spawns an agent subprocess (via main process IPC), creates an IPC-backed
 * transport, and runs the full ACP lifecycle (initialize + newSession) using
 * the same AgentConnection + compose stack as the server-side path.
 */
export async function createAgentSession(
	agentName: string,
	cwd: string,
): Promise<DemoAgentSession> {
	// 1. Spawn subprocess in main process, get agentId
	const agentId = await window.franklinBridge.spawn(agentName, cwd);

	// 2. Create IPC-backed transport (MessagePort-like byte channel)
	const transport = createIpcTransport(agentId);

	// 3. Wire up AgentConnection + middleware stack (identical to server-side)
	const connection = new AgentConnection(transport);
	const { store, handler } = createSessionStore();
	const stack = compose(connection, [], handler);

	// 4. ACP handshake
	await stack.initialize({
		protocolVersion: PROTOCOL_VERSION,
		clientCapabilities: {},
	});

	// 5. Create session
	const { sessionId } = await stack.newSession({
		cwd,
		mcpServers: [],
	});

	return {
		agentId,
		agentName,
		sessionId,
		stack,
		store,
		dispose: () => stack.dispose(),
	};
}
