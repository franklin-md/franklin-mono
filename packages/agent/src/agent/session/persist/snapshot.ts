import { createStore, createStoreResult } from '@franklin/extensions';
import type { StoreResult, StoreEntry } from '@franklin/extensions';
import type { Session } from '../types.js';
import type { SessionSnapshot, StoreSnapshot } from './types.js';

// ---------------------------------------------------------------------------
// Snapshot — extract serializable state from a live Session
// ---------------------------------------------------------------------------

export function snapshotSession(session: Session): SessionSnapshot {
	const ctx = session.tracker.get();
	const stores: Record<string, StoreSnapshot> = {};

	for (const [name, entry] of session.agent.stores.stores) {
		stores[name] = {
			value: entry.store.get(),
			sharing: entry.sharing,
		};
	}

	return {
		sessionId: session.sessionId,
		systemPrompt: ctx.history.systemPrompt,
		messages: ctx.history.messages,
		config: ctx.config,
		stores,
	};
}

// ---------------------------------------------------------------------------
// Hydrate — rebuild a StoreResult from serialized store entries
// ---------------------------------------------------------------------------

export function hydrateStores(
	stores: Record<string, StoreSnapshot>,
): StoreResult {
	const entries = new Map<string, StoreEntry>();

	for (const [name, { value, sharing }] of Object.entries(stores)) {
		entries.set(name, {
			store: createStore(value),
			sharing,
		});
	}

	return createStoreResult(entries);
}
