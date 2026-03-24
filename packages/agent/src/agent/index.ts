export { createAgent } from './create.js';
export { SessionManager, emptyCtx, mergeCtx } from './session/index.js';
export type {
	Session,
	SpawnFn,
	PersistenceOptions,
} from './session/index.js';
export type { Agent } from './types.js';

// Persistence
export {
	SessionMap,
	snapshotSession,
	Debouncer,
	createFileSessionPersister,
	createFilePoolPersister,
	createFilePersistence,
} from './session/persist/index.js';
export { hydrateStores } from '@franklin/extensions';
export type {
	OnRestore,
	PersistedCtx,
	Persister,
	SessionSnapshot,
	StoreSnapshot,
	FileSystemOps,
} from './session/persist/index.js';
