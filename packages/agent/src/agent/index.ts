export { createAgent } from './create.js';
export { SessionManager } from './session/index.js';
export type { Session, SessionOptions, SpawnFn } from './session/index.js';
export type { Agent } from './types.js';

// Persistence
export {
	SessionMap,
	snapshotSession,
	hydrateStores,
	createFilePersister,
} from './session/persist/index.js';
export type {
	Persister,
	SessionSnapshot,
	StoreSnapshot,
	FileSystemOps,
} from './session/persist/index.js';
