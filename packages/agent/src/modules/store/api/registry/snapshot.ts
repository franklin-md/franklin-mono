import type { StoreMetadata } from './types.js';

/**
 * Serialized value for a single store registry entry.
 */
export type StoreSnapshot = StoreMetadata & {
	value: unknown;
};
