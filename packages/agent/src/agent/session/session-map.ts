import type { Session } from './types.js';

/**
 * In-memory session storage with change notification.
 */
export class SessionMap {
	private sessions = new Map<string, Session>();
	private listeners = new Set<() => void>();

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

	/** Register a live session. */
	register(session: Session): void {
		this.sessions.set(session.sessionId, session);
		this.notify();
	}

	/**
	 * Remove a session by ID.
	 * Disposes the runtime and notifies listeners.
	 */
	async remove(id: string): Promise<void> {
		const session = this.sessions.get(id);
		if (!session) return;

		await session.runtime.dispose();
		this.sessions.delete(id);
		this.notify();
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}
