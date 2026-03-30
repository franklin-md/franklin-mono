import type { Persister } from '@franklin/lib';
import type { Session } from './types.js';
import type { SessionSnapshot } from './persist/types.js';
import { snapshotSession } from './persist/snapshot.js';

export type OnRestore = (snapshot: SessionSnapshot) => Promise<void>;

/**
 * Session storage with auto-persistence via CtxTracker onChange.
 */
export class SessionMap {
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

	/**
	 * Remove a session by ID.
	 *
	 * Disposes the agent, detaches the tracker's auto-persist hook,
	 * removes the persisted snapshot, and notifies listeners.
	 */
	async remove(id: string): Promise<void> {
		const session = this.sessions.get(id);
		if (!session) return;

		// Detach auto-persist so dispose doesn't trigger a save
		session.tracker.onChange = undefined;

		await session.agent.dispose();
		this.sessions.delete(id);

		if (this.persister) {
			await this.persister.delete(id);
		}

		// TODO: garbage-collect orphaned store pool entries

		this.notify();
	}

	/**
	 * Register a live session.
	 *
	 * When a persister is configured, wires the tracker's onChange to
	 * auto-persist the session snapshot.
	 */
	register(session: Session): void {
		this.sessions.set(session.sessionId, session);
		this.notify();

		if (this.persister) {
			const persister = this.persister;
			const persist = () => {
				void snapshotSession(session).then((snapshot) =>
					persister.save(session.sessionId, snapshot),
				);
			};
			session.tracker.onChange = persist;
			// Persist initial state so session survives a crash before first prompt
			persist();
		}
	}

	// -----------------------------------------------------------------------
	// Restore
	// -----------------------------------------------------------------------

	/**
	 * Load all persisted snapshots and hydrate each into a live session
	 * using the provided factory. The factory handles transport spawning,
	 * extension compilation, and agent initialization — this layer handles
	 * registration and persistence wiring.
	 */
	async restore(factory: OnRestore): Promise<void> {
		const snapshots = await this.loadAll();
		for (const snapshot of snapshots) {
			await factory(snapshot);
		}
	}

	// -----------------------------------------------------------------------
	// Lifecycle
	// -----------------------------------------------------------------------

	private async loadAll(): Promise<SessionSnapshot[]> {
		if (!this.persister) return [];
		// TODO: Backwards compatibility for old snapshots? I.e. if we make snapshots have an extra field, maybe we should default?
		return [...(await this.persister.load()).values()];
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}
