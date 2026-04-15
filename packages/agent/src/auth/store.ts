import {
	createPersistedStore,
	createStore,
	type PersistedStore,
} from '@franklin/extensions';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { AuthEntries } from './types.js';

// ---------------------------------------------------------------------------
// Default location
// ---------------------------------------------------------------------------

export const DEFAULT_AUTH_FILE = 'auth.json';

export type AuthStore = PersistedStore<AuthEntries>;

export function createAuthStore(
	filesystem: Filesystem,
	appDir: AbsolutePath,
): AuthStore {
	const path = joinAbsolute(appDir, DEFAULT_AUTH_FILE);

	return createPersistedStore(createStore<AuthEntries>({}), {
		async restore(): Promise<AuthEntries> {
			return await filesystem
				.readFile(path)
				.then(
					(data) => JSON.parse(new TextDecoder().decode(data)) as AuthEntries,
				)
				.catch(() => ({}));
		},
		async persist(value): Promise<void> {
			await filesystem.writeFile(path, JSON.stringify(value, null, 2));
		},
		isEqual: areAuthEntriesEqual,
	});
}

function areAuthEntriesEqual(left: AuthEntries, right: AuthEntries): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}
