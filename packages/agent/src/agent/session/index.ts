import { CtxTracker } from '@franklin/mini-acp';
import { DebouncedPersister } from '@franklin/lib';
import type { Persister } from '@franklin/lib';
import type {
	Extension,
	CoreAPI,
	PoolStoreSnapshot,
	StoreAPI,
	StoreResult,
} from '@franklin/extensions';
import {
	createEmptyStoreResult,
	hydrateStores,
	StorePool,
} from '@franklin/extensions';
import { createAgent } from '../create.js';
import { emptyCtx, mergeCtx } from './ctx.js';
import { ctxExtension } from './ctx-extension.js';
import { SessionMap } from './persist/session-map.js';
import type { PersistedCtx, SessionSnapshot } from './persist/types.js';
import type { SpawnFn, Session } from './types.js';

export { emptyCtx, mergeCtx };
export type { Session, SpawnFn };

export type PersistenceOptions = {
	session: Persister<SessionSnapshot>;
	pool: Persister<PoolStoreSnapshot>;
	delayMs?: number;
};

/**
 * Manages agent sessions — handles transport spawning, extension compilation,
 * and protocol initialization for each session lifecycle command.
 *
 * Owns a shared {@link StorePool} that all sessions register their stores
 * into. This decouples store lifecycle from session lifecycle and preserves
 * shared-store identity across persistence/restore.
 *
 * When persistence options are provided, session saves are debounced and
 * the pool persists its own store entries via a debounced
 * `Persister<PoolStoreSnapshot>`.
 */
export class SessionManager {
	private readonly sessions: SessionMap;
	private readonly pool: StorePool;
	private readonly persister?: Persister<SessionSnapshot>;

	constructor(
		private readonly spawn: SpawnFn,
		private readonly extensions: Extension<CoreAPI & StoreAPI>[],
		persistence?: PersistenceOptions,
	) {
		const delayMs = persistence?.delayMs ?? 500;

		const sessionPersister = persistence?.session
			? new DebouncedPersister(persistence.session, delayMs)
			: undefined;
		const poolPersister = persistence?.pool
			? new DebouncedPersister(persistence.pool, delayMs)
			: undefined;

		this.pool = new StorePool(poolPersister);
		this.persister = sessionPersister;
		this.sessions = new SessionMap(sessionPersister);
	}

	/**
	 * Create a brand new session with no parent state.
	 */
	async new(): Promise<Session> {
		return this.createAndInit(emptyCtx());
	}

	/**
	 * Fork from an existing session — copies stores AND injects
	 * the parent's full Ctx into the new agent's context.
	 */
	async fork(sessionId: string): Promise<Session> {
		const parent = this.get(sessionId);
		const parentCtx = mergeCtx(parent.tracker.get());
		const copiedStores = parent.agent.stores.copy('private');

		return this.createAndInit(parentCtx, copiedStores);
	}

	/**
	 * Create a child session — copies stores from parent but starts
	 * a fresh conversation (no history injection).
	 */
	async child(sessionId: string): Promise<Session> {
		const parent = this.get(sessionId);
		const copiedStores = parent.agent.stores.copy('private');
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
	 * Retrieve a session by ID. Throws if not found.
	 */
	get(sessionId: string): Session {
		return this.sessions.get(sessionId);
	}

	/**
	 * Restore all sessions from the persister.
	 *
	 * Two-phase restore:
	 *   1. Restore pool entries from persistent storage
	 *   2. Load session snapshots → hydrate each by wiring store refs
	 *      to the now-live pool entries, then compile extensions and
	 *      replay context.
	 *   3. GC orphaned pool entries (abnormal shutdown recovery) —
	 *      the pool handles its own persister deletion.
	 */
	async restore(): Promise<void> {
		if (!this.persister) return;

		// Phase 1: hydrate the store pool
		await this.pool.restore();

		// Phase 2: restore sessions
		await this.sessions.restore(async (snapshot) => {
			await this.createAndInit(
				snapshot.ctx,
				hydrateStores(snapshot.stores, this.pool),
				snapshot.sessionId,
			);
		});

		// Phase 3: GC orphaned pool entries (abnormal shutdown recovery)
		await this.pool.gc(this.collectPoolIds());
	}

	/**
	 * Remove a session and garbage-collect orphaned pool entries.
	 */
	async remove(sessionId: string): Promise<void> {
		await this.sessions.remove(sessionId);
		await this.pool.gc(this.collectPoolIds());
	}

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	private async createAndInit(
		ctx: PersistedCtx,
		existingStores?: StoreResult,
		sessionId?: string,
	): Promise<Session> {
		const transport = await this.spawn();
		const tracker = new CtxTracker();

		// Append ctxExtension at the tail so it sees final transformed params
		const extensions = [...this.extensions, ctxExtension(tracker)];
		const seed = existingStores ?? createEmptyStoreResult(this.pool);
		const agent = await createAgent(extensions, transport, seed);
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

	private collectPoolIds(): Set<string> {
		return this.sessions.collectPoolIds();
	}
}
