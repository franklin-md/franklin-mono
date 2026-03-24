import type { Session } from './types.js';
import type { Persister, SessionSnapshot } from './persist/types.js';
import { snapshotSession } from './persist/snapshot.js';

export type OnRestore = (snapshot: SessionSnapshot) => Promise<void>;

/**
 * Session storage with auto-persistence via CtxTracker onChange.
 */
export class SessionMap {
	private sessions = new Map<string, Session>();

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

	/**
	 * Register a live session.
	 *
	 * When a persister is configured, wires the tracker's onChange to
	 * auto-persist the session snapshot.
	 */
	register(session: Session): void {
		this.sessions.set(session.sessionId, session);

		if (this.persister) {
			const persist = () => {
				void this.persister!.save(session.sessionId, snapshotSession(session));
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
		return [...(await this.persister.load()).values()];
	}
}
