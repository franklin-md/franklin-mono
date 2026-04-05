import type { RuntimeSystem } from '@franklin/extensions';
import { createRuntime } from '@franklin/extensions';
import type { SessionRegistry } from './registry.js';
import type { Session } from './types.js';
import type { SessionState, SessionRuntime } from '../../types.js';
import type {
	FranklinExtension,
	FranklinExtensionApi,
} from '../../app/types.js';

/** Two-level partial for session creation overrides. */
type PartialState = {
	core?: Partial<SessionState['core']>;
	store?: SessionState['store'];
	env?: Partial<SessionState['env']>;
};

/**
 * Manages agent sessions — a thin orchestrator over the RuntimeSystem.
 *
 * Each lifecycle method delegates to a shared `createSession` that
 * calls `createRuntime`, registers, and returns a Session.
 */
export class SessionManager {
	constructor(
		private readonly sessions: SessionRegistry,
		private readonly system: RuntimeSystem<
			SessionState,
			FranklinExtensionApi,
			SessionRuntime
		>,
		private readonly extensions: FranklinExtension[],
	) {}

	/**
	 * Create a brand new session. Accepts a partial state that is
	 * merged over the system's empty state.
	 */
	async new(overrides?: PartialState): Promise<Session> {
		const empty = this.system.emptyState();
		const state: SessionState = {
			core: { ...empty.core, ...overrides?.core },
			store: overrides?.store ?? empty.store,
			env: { ...empty.env, ...overrides?.env },
		};
		return this.createSession(state);
	}

	/**
	 * Fork from an existing session — copies stores AND injects
	 * the parent's full history into the new session.
	 */
	async fork(sessionId: string): Promise<Session> {
		const forkedState = await this.get(sessionId).runtime.fork();
		return this.createSession(forkedState);
	}

	/**
	 * Create a child session — shares shared stores from parent but starts
	 * a fresh conversation (private stores reset to initial).
	 */
	async child(sessionId: string): Promise<Session> {
		const childState = await this.get(sessionId).runtime.child();
		return this.createSession(childState);
	}

	/* TODO: Reimplement rewind. It's harder than originally thought as you would want
	the conversation UI to go back in time. This is probably why Pi embeds the
	state in the session tree. */

	/**
	 * Remove a session — disposes the runtime and removes from the registry.
	 */
	async remove(sessionId: string): Promise<void> {
		await this.sessions.remove(sessionId);
	}

	/**
	 * Retrieve a session by ID. Throws if not found.
	 */
	get(sessionId: string): Session {
		return this.sessions.get(sessionId);
	}

	/** Return all live sessions. */
	list(): Session[] {
		return this.sessions.list();
	}

	/** Subscribe to session list changes. Returns an unsubscribe function. */
	subscribe(listener: () => void): () => void {
		return this.sessions.subscribe(listener);
	}

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	private async createSession(
		state: SessionState,
		sessionId?: string,
	): Promise<Session> {
		const runtime = await createRuntime(this.system, state, this.extensions);

		const id = sessionId ?? crypto.randomUUID();
		const session: Session = { sessionId: id, runtime };
		this.sessions.register(session, { sessionId: id, state });
		return session;
	}
}
