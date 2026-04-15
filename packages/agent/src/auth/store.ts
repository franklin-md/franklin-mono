import {
	createPersistedStore,
	createStore,
	type PersistedStore,
} from '@franklin/extensions';
import { decode } from '@franklin/lib';
import type { Filesystem } from '@franklin/lib';
import type { AuthEntries } from './types.js';

// ---------------------------------------------------------------------------
// Default location
// ---------------------------------------------------------------------------

export const DEFAULT_AUTH_PATH = 'auth.json';

export type AuthStore = PersistedStore<AuthEntries>;

export function createAuthStore(filesystem: Filesystem): AuthStore {
	return createPersistedStore(createStore<AuthEntries>({}), {
		async restore(): Promise<AuthEntries> {
			return await filesystem
				.readFile(DEFAULT_AUTH_PATH)
				.then((data) => JSON.parse(decode(data)) as AuthEntries)
				.catch(() => ({}));
		},
		async persist(value): Promise<void> {
			await filesystem.writeFile(
				DEFAULT_AUTH_PATH,
				JSON.stringify(value, null, 2),
			);
		},
		isEqual: areAuthEntriesEqual,
	});
}

function areAuthEntriesEqual(left: AuthEntries, right: AuthEntries): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}
