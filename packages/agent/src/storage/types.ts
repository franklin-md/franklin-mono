import type {
	PersistedStore,
	SessionState,
	StoreSnapshot,
} from '@franklin/extensions';
import type { StoreRegistry } from '@franklin/extensions';
import type { Persister } from '@franklin/lib';
import type { AuthEntries } from '../auth/types.js';
import type { AppSettings } from '../settings/types.js';

export type SettingsStore = PersistedStore<AppSettings>;
export type AuthStore = PersistedStore<AuthEntries>;

export interface Storage<S extends SessionState> {
	readonly settings: SettingsStore;
	readonly auth: AuthStore;
	readonly sessions: Persister<S>;
	readonly stores: StoreRegistry;
	restore(): Promise<void>;
}

export interface FilePersistence<S extends SessionState> {
	readonly session: Persister<S>;
	readonly store: Persister<StoreSnapshot>;
}
