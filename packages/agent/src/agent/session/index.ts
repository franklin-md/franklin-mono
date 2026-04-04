import type { RuntimeSystem, CoreState } from '@franklin/extensions';
import { createRuntime } from '@franklin/extensions';
import { SessionMap } from './session-map.js';
import type { Session } from './types.js';
import type { SessionState, SessionRuntime } from '../../types.js';
import type {
	FranklinExtension,
	FranklinExtensionApi,
} from '../../app/types.js';
import type { IAuthManager } from '../../auth/types.js';

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
 * calls `createRuntime`, injects auth, registers, and returns a Session.
 */
export class SessionManager {
	private readonly sessions = new SessionMap();
	private readonly authManager: IAuthManager;

	constructor(
		private readonly system: RuntimeSystem<
			SessionState,
			FranklinExtensionApi,
			SessionRuntime
		>,
		private readonly extensions: FranklinExtension[],
		authManager: IAuthManager,
	) {
		this.authManager = authManager;

		this.authManager.onAuthChange(
			async (provider: string, authKey: string | undefined) => {
				await this.syncSessionsForProvider(provider, authKey);
			},
		);
	}

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
	 * Remove a session — disposes the runtime and removes from the map.
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
		await this.injectAuth(runtime, state.core.llmConfig);

		const session: Session = {
			sessionId: sessionId ?? crypto.randomUUID(),
			runtime,
		};
		this.sessions.register(session);
		return session;
	}

	private async injectAuth(
		runtime: SessionRuntime,
		llmConfig: CoreState['core']['llmConfig'],
	): Promise<void> {
		const provider =
			llmConfig.provider ?? Object.keys(await this.authManager.load())[0];
		if (!provider) return;

		const apiKey = await this.authManager.getApiKey(provider);
		if (!apiKey) return;

		await runtime.setContext({
			config: { ...llmConfig, provider, apiKey },
		});
	}

	private async syncSessionsForProvider(
		provider: string,
		authKey: string | undefined,
	): Promise<void> {
		const updates: Promise<unknown>[] = [];

		for (const session of this.sessions.list()) {
			const state = await session.runtime.state();
			if (state.core.llmConfig.provider !== provider) continue;

			updates.push(
				session.runtime.setContext({
					config: {
						...state.core.llmConfig,
						provider,
						apiKey: authKey,
					},
				}),
			);
		}

		await Promise.all(updates);
	}
}
