import type {
	AgentConnection,
	AgentControl,
	Middleware,
	PromptResponse,
} from '@franklin/agent/browser';
import { connect, sequence, PROTOCOL_VERSION } from '@franklin/agent/browser';

import type { AgentSessionStore, ReactAgentSession } from './session-store.js';
import { createSessionStore } from './session-store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus = 'idle' | 'running' | 'error' | 'disposed';

export type CreateConnection = (
	agent: string,
	cwd: string,
) => Promise<AgentConnection>;

export interface AgentManagerOptions {
	createConnection: CreateConnection;
	/** Static middlewares shared across all sessions. */
	middlewares?: Middleware[];
	/** Factory that produces fresh middleware per spawn (for stateful middleware). */
	createMiddlewares?: () => Middleware[];
}

// ---------------------------------------------------------------------------
// ManagedSession
// ---------------------------------------------------------------------------

export class ManagedSession implements ReactAgentSession {
	readonly id: string;
	readonly agentName: string;
	readonly control: AgentControl;
	readonly sessionId: string;
	readonly store: AgentSessionStore;

	private _status: AgentStatus = 'idle';
	private readonly _onStatusChange: () => void;

	constructor(
		id: string,
		agentName: string,
		control: AgentControl,
		sessionId: string,
		store: AgentSessionStore,
		onStatusChange: () => void,
	) {
		this.id = id;
		this.agentName = agentName;
		this.control = control;
		this.sessionId = sessionId;
		this.store = store;
		this._onStatusChange = onStatusChange;
	}

	get status(): AgentStatus {
		return this._status;
	}

	private setStatus(status: AgentStatus): void {
		if (this._status !== status) {
			this._status = status;
			this._onStatusChange();
		}
	}

	async prompt(text: string): Promise<PromptResponse> {
		if (this._status === 'disposed') {
			throw new Error('Cannot prompt a disposed session');
		}
		this.setStatus('running');
		try {
			const response = await this.control.prompt({
				sessionId: this.sessionId,
				prompt: [{ type: 'text', text }],
			});
			this.setStatus('idle');
			return response;
		} catch (error) {
			this.setStatus('error');
			throw error;
		}
	}

	async dispose(): Promise<void> {
		if (this._status === 'disposed') return;
		this.setStatus('disposed');
		await this.control.dispose();
	}
}

// ---------------------------------------------------------------------------
// AgentManager
// ---------------------------------------------------------------------------

let nextDefaultId = 0;

export class AgentManager {
	private readonly _createConnection: CreateConnection;
	private readonly _middlewares: Middleware[];
	private readonly _createMiddlewares?: () => Middleware[];
	private readonly _sessions = new Map<string, ManagedSession>();
	private readonly _listeners = new Set<() => void>();
	private _snapshot: readonly ManagedSession[] = [];

	constructor(options: AgentManagerOptions) {
		this._createConnection = options.createConnection;
		this._middlewares = options.middlewares ?? [];
		this._createMiddlewares = options.createMiddlewares;
	}

	// --- useSyncExternalStore-compatible ---

	subscribe = (listener: () => void): (() => void) => {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	};

	getSnapshot = (): readonly ManagedSession[] => {
		return this._snapshot;
	};

	// --- Lifecycle ---

	async spawn(
		agent: string,
		cwd: string,
		options?: { id?: string },
	): Promise<ManagedSession> {
		const id = options?.id ?? `agent-${nextDefaultId++}`;

		if (this._sessions.has(id)) {
			throw new Error(`Session with id "${id}" already exists`);
		}

		const connection = await this._createConnection(agent, cwd);
		const { store, middleware, handler } = createSessionStore();

		const middlewares = this._createMiddlewares
			? [middleware, ...this._middlewares, ...this._createMiddlewares()]
			: [middleware, ...this._middlewares];
		const control = connect(connection, sequence(middlewares), handler);

		await control.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});

		const { sessionId } = await control.newSession({
			cwd,
			mcpServers: [],
		});

		const session = new ManagedSession(
			id,
			agent,
			control,
			sessionId,
			store,
			() => this._emit(),
		);

		this._sessions.set(id, session);
		this._emit();

		return session;
	}

	get(id: string): ManagedSession | undefined {
		return this._sessions.get(id);
	}

	async dispose(id: string): Promise<void> {
		const session = this._sessions.get(id);
		if (!session) return;
		this._sessions.delete(id);
		await session.dispose();
		this._emit();
	}

	async disposeAll(): Promise<void> {
		const sessions = [...this._sessions.values()];
		this._sessions.clear();
		await Promise.all(sessions.map((s) => s.dispose()));
		this._emit();
	}

	// --- Internal ---

	private _emit(): void {
		this._snapshot = [...this._sessions.values()];
		for (const listener of this._listeners) {
			listener();
		}
	}
}
