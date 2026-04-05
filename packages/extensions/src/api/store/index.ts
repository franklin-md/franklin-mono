export type { ReadonlyStore, Store } from './types.js';
export type { Sharing, ForkMode } from './sharing.js';
export type { StoreAPI } from './api.js';
export type { StoreKey, StoreValueType } from './key.js';
export { storeKey } from './key.js';
export type { StoreResult } from './registry/result.js';
export {
	createEmptyStoreResult,
	createStoreResult,
} from './registry/result.js';
export { createStore } from './create.js';
export { StoreRegistry } from './registry/index.js';
export type { StoreMapping } from './registry/mapping.js';
export type { StoreEntry } from './registry/types.js';
export type { StoreSnapshot } from './registry/snapshot.js';
