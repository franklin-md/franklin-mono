import type { StoreSnapshot } from '@franklin/extensions';
import type { Session } from '../types.js';
import type { SessionSnapshot } from './types.js';

// ---------------------------------------------------------------------------
// Snapshot — extract serializable state from a live Session
// ---------------------------------------------------------------------------

/**
 * Capture a session's state as a serializable snapshot.
 *
 * Store values are NOT inlined — instead each store is referenced by its
 * pool ID. The pool itself is persisted separately.
 */
export function snapshotSession(session: Session): SessionSnapshot {
	const ctx = session.tracker.get();
	const stores: Record<string, StoreSnapshot> = {};

	for (const [name, entry] of session.agent.stores.stores) {
		stores[name] = {
			poolId: entry.poolId,
			sharing: entry.sharing,
		};
	}

	return {
		sessionId: session.sessionId,
		ctx: {
			history: ctx.history,
			config: ctx.config,
		},
		stores,
	};
}
