import type { Persister } from '@franklin/lib';

import { BaseStore } from '../base.js';
import type { Store } from '../types.js';
import type { StoreSnapshot } from './snapshot.js';
import type { Sharing } from '../sharing.js';
import type { StoreEntry } from './types.js';

/**
 * Central registry of all live store instances.
 *
 * Sessions hold references (refs) into the pool rather than owning
 * stores directly. This decouples store lifecycle from session lifecycle
 * and preserves shared-store identity across persistence/restore.
 *
 * When constructed with a persister, the pool owns its own persistence
 * lifecycle — `restore()` hydrates from disk, and `gc()` cleans up
 * orphaned entries (both in-memory and on disk).
 */
export class StoreRegistry {
	private entries = new Map<string, StoreEntry>();

	constructor(private readonly persister?: Persister<StoreSnapshot>) {}

	/**
	 * Create a new pool entry with a fresh UUID.
	 */
	create<T>(initial: T, sharing: Sharing): StoreEntry {
		const ref = crypto.randomUUID();
		const store: Store<T> = new BaseStore(initial);
		const entry: StoreEntry = { ref, sharing, store };
		this.add(entry);
		this.persist(entry);
		return entry;
	}

	/**
	 * Look up a live store by pool ID. Throws if not found.
	 */
	get(ref: string): StoreEntry {
		const entry = this.entries.get(ref);
		if (!entry) throw new Error(`Store pool entry "${ref}" not found`);
		return entry;
	}

	/**
	 * Hydrate the pool from persisted storage.
	 * No-op when no persister is configured.
	 */
	async restore(): Promise<void> {
		if (!this.persister) return;
		const data = await this.persister.load();
		for (const [ref, { value, sharing }] of data) {
			this.add({ ref, sharing, store: new BaseStore(value) });
		}
	}

	/**
	 * Persist a single pool entry to the persister.
	 * No-op when no persister is configured.
	 */
	private persist(entry: StoreEntry): void {
		if (!this.persister) return;
		const snapshot: StoreSnapshot = {
			ref: entry.ref,
			sharing: entry.sharing,
			value: entry.store.get(),
		};
		void this.persister.save(entry.ref, snapshot);
	}

	private add(entry: StoreEntry): void {
		// I wonder if we need to unsubscribe from the store on GC?
		// It feels like we don't because if we are GCing, there won't be any changes to the store.
		if (this.persister) {
			entry.store.subscribe(() => {
				this.persist(entry);
			});
		}
		this.entries.set(entry.ref, entry);
	}
}
