import type {
	AgentCommands,
	AgentConnection,
	Middleware,
	PromptResponse,
} from '@franklin/agent/browser';
import {
	emptyMiddleware,
	joinCommands,
	joinEvents,
	sequence,
	PROTOCOL_VERSION,
	RequestError,
} from '@franklin/agent/browser';

import type { AgentSessionStore, ReactAgentSession } from './session-store.js';
import { createSessionStore } from './session-store.js';

// Re-export EVENT_METHODS from the middleware types via the stack index
import type { AgentEvents } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_METHODS = [
	'sessionUpdate',
	'requestPermission',
	'readTextFile',
	'writeTextFile',
	'createTerminal',
	'terminalOutput',
	'releaseTerminal',
	'waitForTerminalExit',
	'killTerminal',
] as const;

function fillHandler(handler: Partial<AgentEvents>): AgentEvents {
	const result: Record<string, unknown> = {};
	for (const method of EVENT_METHODS) {
		result[method] =
			handler[method] ??
			(() => {
				throw RequestError.methodNotFound(method);
			});
	}
	return result as unknown as AgentEvents;
}

function composeAll(middlewares: Middleware[]): Middleware {
	return middlewares.reduce((acc, mw) => sequence(acc, mw), emptyMiddleware);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus = 'idle' | 'running' | 'error' | 'disposed';

export type CreateConnection = (
	agent: string,
	cwd: string,
	handler: AgentEvents,
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
	readonly commands: AgentCommands;
	readonly sessionId: string;
	readonly store: AgentSessionStore;
	private readonly _dispose: () => Promise<void>;

	private _status: AgentStatus = 'idle';
	private readonly _onStatusChange: () => void;

	constructor(
		id: string,
		agentName: string,
		commands: AgentCommands,
		sessionId: string,
		store: AgentSessionStore,
		disposeFn: () => Promise<void>,
		onStatusChange: () => void,
	) {
		this.id = id;
		this.agentName = agentName;
		this.commands = commands;
		this.sessionId = sessionId;
		this.store = store;
		this._dispose = disposeFn;
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
			const response = await this.commands.prompt({
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
		await this._dispose();
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

		const { store, middleware, handler } = createSessionStore();

		const middlewares = this._createMiddlewares
			? [middleware, ...this._middlewares, ...this._createMiddlewares()]
			: [middleware, ...this._middlewares];
		const composed = composeAll(middlewares);

		const totalHandler = fillHandler(handler);
		const composedHandler = joinEvents(composed, totalHandler);
		const connection = await this._createConnection(
			agent,
			cwd,
			composedHandler,
		);
		const commands = joinCommands(composed, connection.commands);

		await commands.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});

		const { sessionId } = await commands.newSession({
			cwd,
			mcpServers: [],
		});

		const session = new ManagedSession(
			id,
			agent,
			commands,
			sessionId,
			store,
			() => connection.dispose(),
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
