import type { StoreRegistry } from './index.js';
import { StoreResult } from './result.js';
import type { StoreMapping } from './types.js';

/**
 * Rebuild a StoreResult by wiring serialized store references to live pool
 * entries. The pool must already be restored before calling this.
 */
export function hydrateStores(
	references: StoreMapping,
	registry: StoreRegistry,
): StoreResult {
	return new StoreResult(registry, references);
}
