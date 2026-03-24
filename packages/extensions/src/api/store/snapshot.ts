import type { StoreResult } from './result.js';
import type { Sharing } from './sharing.js';

/**
 * Per-store reference within a session snapshot.
 * Points to a pool entry by ID; the actual value lives in the pool.
 */
export type StoreSnapshot = {
	poolId: string;
	sharing: Sharing;
};

/**
 * Serialized value for a single store pool entry.
 */
export type PoolStoreSnapshot = {
	value: unknown;
	sharing: Sharing;
};

export function snapshotStoreResult(
	result: StoreResult,
): Record<string, StoreSnapshot> {
	const snapshots: Record<string, StoreSnapshot> = {};
	for (const [name, entry] of result.stores) {
		snapshots[name] = {
			poolId: entry.poolId,
			sharing: entry.sharing,
		};
	}
	return snapshots;
}
