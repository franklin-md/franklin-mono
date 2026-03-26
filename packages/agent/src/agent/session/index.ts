import { CtxTracker } from '@franklin/mini-acp';
import { DebouncedPersister } from '@franklin/lib';
import type { Persister } from '@franklin/lib';
import type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
	StoreSnapshot,
} from '@franklin/extensions';
import {
	createEmptyStoreResult,
	createStoreResult,
	StorePool as StoreRegistry,
} from '@franklin/extensions';
import { createAgent } from '../create.js';
import {
	createResolvedConfig,
	sameConfig,
	type ConfigOptions,
} from './config.js';
import { emptyCtx, mergeCtx } from './ctx.js';
import { ctxExtension } from './ctx-extension.js';
import { SessionMap } from './session-map.js';
import type { PersistedCtx, SessionSnapshot } from './persist/types.js';
import type { SpawnFn, Session } from './types.js';
import type { IAuthManager } from '@franklin/auth';

export { emptyCtx, mergeCtx };
export type { Session, SpawnFn };

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
	private readonly persister?: Persister<SessionSnapshot>;
	private defaultConfig: ConfigOptions;

	constructor(
		private readonly spawn: SpawnFn,
		private readonly extensions: Extension<CoreAPI & StoreAPI>[],
		authManager: IAuthManager,
		persistence?: PersistenceOptions,
		configOptions?: ConfigOptions,
	) {
		const delayMs = persistence?.delayMs ?? 500;

		const sessionPersister = persistence?.session
			? new DebouncedPersister(persistence.session, delayMs)
			: undefined;
		const poolPersister = persistence?.pool
			? new DebouncedPersister(persistence.pool, delayMs)
			: undefined;

		this.registry = new StoreRegistry(poolPersister);
		this.persister = sessionPersister;
		this.sessions = new SessionMap(sessionPersister);
		this.authManager = authManager;
		this.defaultConfig = { ...configOptions };

		this.authManager.onAuthChange(
			async (provider: string, authKey: string | undefined) => {
				await this.syncSessionsForProvider(provider, authKey);
			},
		);
	}

	/**
	 * Create a brand new session with no parent state.
	 */
	async new(configOptions: ConfigOptions | undefined): Promise<Session> {
		// TODO: Create a fresh store result with the registry
		const seed = createEmptyStoreResult(this.registry);
		const config = await this.resolveConfig(configOptions);
		const emptyCtxWithAuth = mergeCtx(emptyCtx(), config ? { config } : {});

		return this.createAndInit(emptyCtxWithAuth, seed);
	}

	/**
	 * Fork from an existing session — copies stores AND injects
	 * the parent's full Ctx into the new agent's context.
	 */
	async fork(sessionId: string): Promise<Session> {
		const parent = this.get(sessionId);
		const parentCtx = mergeCtx(emptyCtx(), parent.tracker.get());
		const copiedStores = parent.agent.stores.share('copy');

		return this.createAndInit(parentCtx, copiedStores);
	}

	/**
	 * Create a child session — shares shared stores from parent but starts
	 * a fresh conversation (private stores reset to initial).
	 */
	async child(sessionId: string): Promise<Session> {
		const parent = this.get(sessionId);
		const copiedStores = parent.agent.stores.share('fresh');
		const ctx = mergeCtx(emptyCtx(), {
			config: parent.tracker.get().config,
		});

		return this.createAndInit(ctx, copiedStores);
	}

	/**
	 * Rewind a session to a given message index — truncates the
	 * shadowed Ctx and resets the agent's context in-place.
	 */
	async rewind(sessionId: string, messageIndex: number): Promise<void> {
		const session = this.get(sessionId);
		const ctx = session.tracker.get();

		await session.agent.setContext({
			ctx: {
				history: {
					systemPrompt: ctx.history.systemPrompt,
					messages: ctx.history.messages.slice(0, messageIndex),
				},
				tools: ctx.tools,
				config: ctx.config,
			},
		});
	}

	/**
	 * Remove a session — disposes the agent, removes from the map,
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
	 *   2. Load session snapshots -> rebuild each StoreResult from the
	 *      persisted name -> ref mapping, then compile extensions and
	 *      replay context.
	 *   3. GC orphaned pool entries (abnormal shutdown recovery) —
	 *      the pool handles its own persister deletion.
	 */
	async restore(): Promise<void> {
		if (!this.persister) return;

		// Phase 1: restore the store pool
		await this.registry.restore();

		// Phase 2: restore sessions
		await this.sessions.restore(async (snapshot) => {
			const config = await this.resolveConfig(snapshot.ctx.config);
			const restoredCtx = mergeCtx(snapshot.ctx, config ? { config } : {});
			await this.createAndInit(
				restoredCtx,
				createStoreResult(this.registry, snapshot.stores),
				snapshot.sessionId,
			);
		});

		// Phase 3: GC orphaned pool entries (abnormal shutdown recovery)
		// TODO: Do should we clean any unreferred stores?
	}

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	private async createAndInit(
		ctx: PersistedCtx,
		existingStores: StoreResult,
		sessionId?: string,
	): Promise<Session> {
		const transport = await this.spawn();
		const tracker = new CtxTracker();
		// Append ctxExtension at the tail so it sees final transformed params
		const agent = await createAgent(
			[...this.extensions, ctxExtension(tracker)],
			transport,
			existingStores,
		);
		await agent.initialize({});
		await agent.setContext({
			ctx: {
				history: ctx.history,
				tools: [],
				config: ctx.config,
			},
		});

		const session: Session = {
			sessionId: sessionId ?? crypto.randomUUID(),
			agent,
			tracker,
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
