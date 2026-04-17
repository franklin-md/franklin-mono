import type { MapFilePersister, RestoreResult } from '@franklin/lib';

import { BaseStore } from '../base.js';
import type { StoreSnapshot } from './snapshot.js';
import type { Sharing } from '../sharing.js';
import type { StoreEntry } from './types.js';

/**
 * Central registry of all live store instances.
 *
 * Sessions hold references (refs) into the registry rather than owning
 * stores directly. This decouples store lifecycle from session lifecycle
 * and preserves shared-store identity across persistence/restore.
 *
 * When constructed with a persister, the registry owns its own persistence
 * lifecycle — `restore()` hydrates from disk, and `gc()` cleans up
 * orphaned entries (both in-memory and on disk).
 */
export class StoreRegistry {
	private entries = new Map<string, StoreEntry>();

	constructor(private readonly persister?: MapFilePersister<StoreSnapshot>) {}

	/**
	 * Create a new registry entry with a fresh UUID.
	 */
	create(sharing: Sharing, initial?: unknown): StoreEntry {
		const ref = crypto.randomUUID();
		const store = new BaseStore(initial);
		const entry: StoreEntry = { ref, sharing, store };
		this.add(entry);
		this.persist(entry);
		return entry;
	}

	/**
	 * Look up a live store by ref. Throws if not found.
	 */
	get(ref: string): StoreEntry {
		const entry = this.entries.get(ref);
		if (!entry) throw new Error(`Store registry entry "${ref}" not found`);
		return entry;
	}

	/**
	 * Hydrate the registry from persisted storage.
	 * No-op when no persister is configured.
	 */
	async restore(): Promise<RestoreResult> {
		if (!this.persister) return { issues: [] };
		const { values, issues } = await this.persister.load();
		for (const [ref, { value, sharing }] of values) {
			this.add({ ref, sharing, store: new BaseStore(value) });
		}
		return { issues };
	}

	/**
	 * Persist a single registry entry to the persister.
	 * No-op when no persister is configured.
	 */
	private persist(entry: StoreEntry): void {
		if (!this.persister) return;
		if (!(entry.store as BaseStore<unknown>).isInitialized()) return;
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
