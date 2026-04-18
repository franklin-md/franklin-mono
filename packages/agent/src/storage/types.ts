import type {
	PersistedStore,
	SessionState,
	StoreSnapshot,
} from '@franklin/extensions';
import type { StoreRegistry } from '@franklin/extensions';
import type { MapFilePersister, RestoreResult } from '@franklin/lib';
import type { AuthEntries } from '../auth/types.js';
import type { AppSettings } from '../settings/schema.js';

export type SettingsStore = PersistedStore<AppSettings>;
export type AuthStore = PersistedStore<AuthEntries>;
export type SessionPersistence<S extends SessionState> = MapFilePersister<S>;

export interface Storage<S extends SessionState> {
	readonly settings: SettingsStore;
	readonly auth: AuthStore;
	readonly sessions: SessionPersistence<S>;
	readonly stores: StoreRegistry;
	restore(): Promise<RestoreResult>;
}

export interface FilePersistence<S extends SessionState> {
	readonly session: SessionPersistence<S>;
	readonly store: MapFilePersister<StoreSnapshot>;
}
