import { CtxTracker } from '@franklin/mini-acp';
import { DebouncedPersister } from '@franklin/lib';
import type { Persister } from '@franklin/lib';
import type {
	StoreResult,
	StoreSnapshot,
	EnvironmentConfig,
} from '@franklin/extensions';
import {
	createEmptyStoreResult,
	createStoreResult,
	StorePool as StoreRegistry,
} from '@franklin/extensions';
import { createAgent } from '../create.js';
import { emptyCtx, mergeCtx } from './context/utils.js';
import { ctxExtension } from './context/extension.js';
import {
	createResolvedConfig,
	sameConfig,
	type ConfigOptions,
} from './config.js';
import { SessionMap } from './session-map.js';
import type { PersistedCtx, SessionSnapshot } from './persist/types.js';
import type { SpawnFn, Session } from './types.js';
import type { FranklinExtension } from '../../app/types.js';
import type { IAuthManager } from '../../auth/types.js';
import type { Platform } from '@franklin/agent';

export type PersistenceOptions = {
	session: Persister<SessionSnapshot>;
	pool: Persister<StoreSnapshot>;
	delayMs?: number;
};

/**
 * Manages agent sessions — handles transport spawning, extension compilation,
 * and protocol initialization for each session lifecycle command.
 *
 * Owns a shared {@link StoreRegistry} that all sessions register their stores
 * into. This decouples store lifecycle from session lifecycle and preserves
 * shared-store identity across persistence/restore.
 *
 * When persistence options are provided, session saves are debounced and
 * the pool persists its own store entries via a debounced
 * `Persister<StoreSnapshot>`.
 */

export class SessionManager {
	private readonly sessions: SessionMap;
	private readonly registry: StoreRegistry;
	private readonly authManager: IAuthManager;

	constructor(
		private readonly system: RuntimeSystem<
			SessionState,
			FranklinExtensionApi,
			SessionRuntime
		>,
		private readonly extensions: FranklinExtension[],
		authManager: IAuthManager,
		registry: StoreRegistry,
		persistence?: { session?: Persister<SessionSnapshot>; delayMs?: number },
	) {
		const delayMs = persistence?.delayMs ?? 500;
		const sessionPersister = persistence?.session
			? new DebouncedPersister(persistence.session, delayMs)
			: undefined;

		this.registry = registry;
		this.sessions = new SessionMap(sessionPersister);
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
	 * Remove a session — disposes the runtime, removes from the map,
	 * and deletes the persisted snapshot.
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

	/**
	 * Restore all sessions from the persister.
	 *
	 * Two-phase restore:
	 *   1. Restore pool entries from persistent storage
	 *   2. Load session snapshots → create runtimes → inject auth
	 */
	async restore(): Promise<void> {
		// Phase 1: restore the store pool
		await this.registry.restore();

		// Phase 2: restore sessions
		await this.sessions.restore(async (snapshot) => {
			await this.createSession(snapshot.state, snapshot.sessionId);
		});

		// TODO: GC orphaned pool entries (abnormal shutdown recovery)
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

	private async resolveConfig(
		configOptions: ConfigOptions | undefined,
	): Promise<PersistedCtx['config']> {
		const config = { ...this.defaultConfig, ...configOptions };
		const provider =
			config.provider ?? Object.keys(await this.authManager.load())[0];
		const apiKey = provider
			? await this.authManager.getApiKey(provider)
			: undefined;

		return createResolvedConfig(config, provider, apiKey);
	}

	private async syncSessionsForProvider(
		provider: string,
		authKey: string | undefined,
	): Promise<void> {
		const updates: Promise<unknown>[] = [];

		for (const session of this.sessions.list()) {
			const currentConfig = session.tracker.get().config;
			if (currentConfig?.provider !== provider) continue;

			const nextConfig = createResolvedConfig(currentConfig, provider, authKey);
			if (!nextConfig || sameConfig(currentConfig, nextConfig)) continue;

			updates.push(
				session.agent.setContext({
					ctx: {
						config: nextConfig,
					},
				}),
			);
		}

		await Promise.all(updates);
	}
}
