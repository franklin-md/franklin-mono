import type { Persister } from '@franklin/lib';
import type { RuntimeBase } from '@franklin/extensions';

import type { Session, SessionSnapshot } from './types.js';

/**
 * Central registry of live sessions with opt-in persistence.
 *
 * Follows the same pattern as StoreRegistry: when constructed with a
 * persister, the registry owns its own persistence lifecycle —
 * `restore()` hydrates from disk, and mutations persist automatically.
 */
export class SessionRegistry<
	S extends Record<string, unknown>,
	RT extends RuntimeBase<S>,
> {
	private sessions = new Map<string, Session<RT>>();
	private listeners = new Set<() => void>();
	private unsubs = new Map<string, () => void>();

	constructor(private readonly persister?: Persister<SessionSnapshot<S>>) {}

	get(id: string): Session<RT> {
		const session = this.sessions.get(id);
		if (!session) {
			throw new Error(`Session ${id} not found`);
		}
		return session;
	}

	has(id: string): boolean {
		return this.sessions.has(id);
	}

	/** Return all live sessions. */
	list(): Session<RT>[] {
		return [...this.sessions.values()];
	}

	/** Subscribe to session list changes. Returns an unsubscribe function. */
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/** Register a live session, persisting its state snapshot. */
	register(session: Session<RT>, snapshot: SessionSnapshot<S>): void {
		this.sessions.set(session.sessionId, session);
		this.persist(snapshot);
		this.watch(session);
		this.notify();
	}

	/**
	 * Remove a session by ID.
	 * Disposes the runtime, deletes from persistence, and notifies listeners.
	 */
	async remove(id: string): Promise<void> {
		const session = this.sessions.get(id);
		if (!session) return;

		this.unsubs.get(id)?.();
		this.unsubs.delete(id);
		await session.runtime.dispose();
		this.sessions.delete(id);
		void this.persister?.delete(id);
		this.notify();
	}

	/**
	 * Hydrate the registry from persisted storage.
	 *
	 * Requires a `hydrate` callback that rebuilds a live runtime
	 * from a snapshot — the registry owns the load/iterate loop but the
	 * caller owns the knowledge of how to create runtimes.
	 *
	 * No-op when no persister is configured.
	 */
	async restore(
		hydrate: (snapshot: SessionSnapshot<S>) => Promise<RT>,
	): Promise<void> {
		if (!this.persister) return;
		const data = await this.persister.load();
		for (const [id, snapshot] of data) {
			const runtime = await hydrate(snapshot);
			const session: Session<RT> = { sessionId: id, runtime };
			this.sessions.set(id, session);
			this.watch(session);
		}
		if (data.size > 0) this.notify();
	}

	private persist(snapshot: SessionSnapshot<S>): void {
		if (!this.persister) return;
		void this.persister.save(snapshot.sessionId, snapshot);
	}

	/**
	 * Subscribe to a session's runtime changes and re-persist the
	 * full session snapshot whenever state settles (turn end, config change).
	 */
	private watch(session: Session<RT>): void {
		if (!this.persister) return;
		const unsub = session.runtime.subscribe(() => {
			void session.runtime.state().then((state) => {
				this.persist({ sessionId: session.sessionId, state });
			});
		});
		this.unsubs.set(session.sessionId, unsub);
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}
