import type { CtxTracker } from '@franklin/mini-acp';
import type { Agent } from '../../types.js';
import type { Session } from '../types.js';
import type { Persister, SessionSnapshot } from './types.js';
import { snapshotSession } from './snapshot.js';

export type RestoreFactory = (
	snapshot: SessionSnapshot,
) => Promise<{ agent: Agent; tracker: CtxTracker }>;

/**
 * Session storage with auto-persistence via CtxTracker onChange.
 */
export class SessionMap {
	private sessions = new Map<string, Session>();

	constructor(private readonly persister?: Persister) {}

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
	 * Register a new session. If `id` is provided (e.g. during restore),
	 * uses that instead of generating a new UUID.
	 *
	 * When a persister is configured, wires the tracker's onChange to
	 * auto-persist the session on every ctx mutation.
	 */
	register(agent: Agent, tracker: CtxTracker, id?: string): Session {
		const sessionId = id ?? crypto.randomUUID();
		const session: Session = { sessionId, agent, tracker };
		this.sessions.set(sessionId, session);

		if (this.persister) {
			const persister = this.persister;
			tracker.onChange = () => {
				void persister.save(sessionId, snapshotSession(session));
			};
			// Persist initial state so session survives a crash before first prompt
			void persister.save(sessionId, snapshotSession(session));
		}

		return session;
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
	async restore(factory: RestoreFactory): Promise<Session[]> {
		const snapshots = await this.loadAll();
		const restored: Session[] = [];

		for (const snapshot of snapshots) {
			const { agent, tracker } = await factory(snapshot);
			const session = this.register(agent, tracker, snapshot.sessionId);
			restored.push(session);
		}

		return restored;
	}

	// -----------------------------------------------------------------------
	// Lifecycle
	// -----------------------------------------------------------------------

	async remove(id: string): Promise<void> {
		const session = this.sessions.get(id);
		if (session) {
			session.tracker.onChange = undefined;
		}
		this.sessions.delete(id);
		if (this.persister) {
			await this.persister.delete(id);
		}
	}

	private async loadAll(): Promise<SessionSnapshot[]> {
		if (!this.persister) return [];
		return this.persister.load();
	}
}
