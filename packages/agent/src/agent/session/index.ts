import type { DeepPartial } from '@franklin/lib';
import type {
	RuntimeSystem,
	RuntimeBase,
	Extension,
} from '@franklin/extensions';
import { createRuntime, resolveState } from '@franklin/extensions';
import type { SessionRegistry } from './registry.js';
import type { Session } from './types.js';

/**
 * Manages agent sessions — a thin orchestrator over the RuntimeSystem.
 *
 * Each lifecycle method delegates to a shared `createSession` that
 * calls `createRuntime`, registers, and returns a Session.
 */
export class SessionManager<
	S extends Record<string, unknown>,
	API,
	RT extends RuntimeBase<S>,
> {
	constructor(
		private readonly sessions: SessionRegistry<S, RT>,
		private readonly system: RuntimeSystem<S, API, RT>,
		private readonly extensions: Extension<API>[],
	) {}

	/**
	 * Create a brand new session. Accepts a deep partial of the state
	 * that is merged over the system's empty state.
	 */
	async new(overrides?: DeepPartial<S>): Promise<Session<RT>> {
		const state = resolveState(this.system.emptyState(), overrides);
		return this.createSession(state);
	}

	/**
	 * Fork from an existing session — copies stores AND injects
	 * the parent's full history into the new session.
	 */
	async fork(sessionId: string): Promise<Session<RT>> {
		const forkedState = await this.get(sessionId).runtime.fork();
		return this.createSession(forkedState);
	}

	/**
	 * Create a child session — shares shared stores from parent but starts
	 * a fresh conversation (private stores reset to initial).
	 */
	async child(sessionId: string): Promise<Session<RT>> {
		const childState = await this.get(sessionId).runtime.child();
		return this.createSession(childState);
	}

	/**
	 * Restore sessions from persisted storage.
	 *
	 * Delegates to the session registry's restore, providing a hydrate
	 * callback that rebuilds a live runtime from each snapshot's state.
	 */
	async restore(): Promise<void> {
		await this.sessions.restore(async (snapshot) =>
			createRuntime(this.system, snapshot.state, this.extensions),
		);
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
	get(sessionId: string): Session<RT> {
		return this.sessions.get(sessionId);
	}

	/** Return all live sessions. */
	list(): Session<RT>[] {
		return this.sessions.list();
	}

	/** Subscribe to session list changes. Returns an unsubscribe function. */
	subscribe(listener: () => void): () => void {
		return this.sessions.subscribe(listener);
	}

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	private async createSession(state: S): Promise<Session<RT>> {
		const runtime = await createRuntime(this.system, state, this.extensions);

		const id = crypto.randomUUID();
		const session: Session<RT> = { sessionId: id, runtime };
		this.sessions.register(session, { sessionId: id, state });
		return session;
	}
}
