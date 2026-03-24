import type { Session } from '../types.js';
import type { SessionSnapshot } from './types.js';
import { cloneCtx } from '../ctx.js';
import type { StoreMapping } from '@franklin/extensions';

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
	const stores: StoreMapping = {};

	for (const [name, entry] of session.agent.stores.entries()) {
		stores[name] = entry.ref;
	}

	return {
		sessionId: session.sessionId,
		ctx: cloneCtx(ctx),
		stores,
	};
}
