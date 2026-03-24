import type { Persister } from '@franklin/lib';

import { BaseStore } from './base.js';
import type { Store } from './types.js';
import type { Sharing } from './sharing.js';
import type { PoolStoreSnapshot } from './snapshot.js';

/**
 * Internal bookkeeping for a single pool entry.
 */
type PoolEntry = {
	store: Store<unknown>;
	sharing: Sharing;
	unsubscribe?: () => void;
};

/**
 * Central registry of all live store instances.
 *
 * Sessions hold references (poolIds) into the pool rather than owning
 * stores directly. This decouples store lifecycle from session lifecycle
 * and preserves shared-store identity across persistence/restore.
 *
 * When constructed with a persister, the pool owns its own persistence
 * lifecycle — `restore()` hydrates from disk, and `gc()` cleans up
 * orphaned entries (both in-memory and on disk).
 */
export class StorePool {
	private entries = new Map<string, PoolEntry>();

	constructor(private readonly persister?: Persister<PoolStoreSnapshot>) {}

	/**
	 * Create a new pool entry with a fresh UUID.
	 */
	create<T>(initial: T, sharing: Sharing): { poolId: string; store: Store<T> } {
		const poolId = crypto.randomUUID();
		const store: Store<T> = new BaseStore(initial);
		this.add(poolId, store as Store<unknown>, sharing);
		this.persist(poolId);
		return { poolId, store };
	}

	/**
	 * Look up a live store by pool ID. Throws if not found.
	 */
	get(poolId: string): Store<unknown> {
		const entry = this.entries.get(poolId);
		if (!entry) throw new Error(`Store pool entry "${poolId}" not found`);
		return entry.store;
	}

	/**
	 * Hydrate the pool from persisted storage.
	 * No-op when no persister is configured.
	 */
	async restore(): Promise<void> {
		if (!this.persister) return;
		const data = await this.persister.load();
		for (const [poolId, { value, sharing }] of data) {
			this.add(poolId, new BaseStore(value), sharing);
		}
	}

	/**
	 * Remove pool entries not referenced by any live session.
	 * When a persister is configured, also deletes the orphaned entries
	 * from persistent storage.
	 */
	async gc(referencedIds: Set<string>): Promise<string[]> {
		const removed: string[] = [];
		for (const poolId of this.entries.keys()) {
			if (!referencedIds.has(poolId)) {
				const entry = this.entries.get(poolId);
				entry?.unsubscribe?.();
				this.entries.delete(poolId);
				removed.push(poolId);
			}
		}
		if (this.persister) {
			for (const poolId of removed) {
				await this.persister.delete(poolId);
			}
		}
		return removed;
	}

	/**
	 * Persist a single pool entry to the persister.
	 * No-op when no persister is configured.
	 */
	private persist(poolId: string): void {
		if (!this.persister) return;
		const entry = this.entries.get(poolId);
		if (!entry) return;
		void this.persister.save(poolId, {
			value: entry.store.get(),
			sharing: entry.sharing,
		});
	}

	private add(
		poolId: string,
		store: Store<unknown>,
		sharing: Sharing,
	): void {
		const unsubscribe = this.persister
			? store.subscribe(() => {
					this.persist(poolId);
				})
			: undefined;
		this.entries.set(poolId, { store, sharing, unsubscribe });
	}
}
