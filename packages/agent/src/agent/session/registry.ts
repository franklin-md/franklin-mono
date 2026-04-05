import type { Persister } from '@franklin/lib';

import type { SessionRuntime } from '../../types.js';
import type { Session } from './types.js';
import type { SessionSnapshot } from './persist/types.js';

/**
 * Central registry of live sessions with opt-in persistence.
 *
 * Follows the same pattern as StoreRegistry: when constructed with a
 * persister, the registry owns its own persistence lifecycle —
 * `restore()` hydrates from disk, and mutations persist automatically.
 */
export class SessionRegistry {
	private sessions = new Map<string, Session>();
	private listeners = new Set<() => void>();

	constructor(private readonly persister?: Persister<SessionSnapshot>) {}

	get(id: string): Session {
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
	list(): Session[] {
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
	register(session: Session, snapshot: SessionSnapshot): void {
		this.sessions.set(session.sessionId, session);
		this.persist(snapshot);
		this.notify();
	}

	/**
	 * Remove a session by ID.
	 * Disposes the runtime, deletes from persistence, and notifies listeners.
	 */
	async remove(id: string): Promise<void> {
		const session = this.sessions.get(id);
		if (!session) return;

		await session.runtime.dispose();
		this.sessions.delete(id);
		void this.persister?.delete(id);
		this.notify();
	}

	/**
	 * Hydrate the registry from persisted storage.
	 *
	 * Requires a `hydrate` callback that rebuilds a live SessionRuntime
	 * from a snapshot — the registry owns the load/iterate loop but the
	 * caller owns the knowledge of how to create runtimes.
	 *
	 * No-op when no persister is configured.
	 */
	async restore(
		hydrate: (snapshot: SessionSnapshot) => Promise<SessionRuntime>,
	): Promise<void> {
		if (!this.persister) return;
		const data = await this.persister.load();
		for (const [id, snapshot] of data) {
			const runtime = await hydrate(snapshot);
			this.sessions.set(id, { sessionId: id, runtime });
		}
		if (data.size > 0) this.notify();
	}

	private persist(snapshot: SessionSnapshot): void {
		if (!this.persister) return;
		void this.persister.save(snapshot.sessionId, snapshot);
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}
