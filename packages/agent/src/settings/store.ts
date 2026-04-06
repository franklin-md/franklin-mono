import { createStore } from '@franklin/extensions';
import type { Store } from '@franklin/extensions';
import type { Filesystem } from '@franklin/lib';
import type { AppSettings } from './types.js';

export const DEFAULT_SETTINGS_PATH = 'settings.json';

export type SettingsStore = Store<AppSettings>;

/** Create an in-memory settings store with default (empty) state. */
export function createSettings(): SettingsStore {
	return createStore<AppSettings>({});
}

/** Load persisted settings from disk into the store. */
export async function loadSettings(
	store: SettingsStore,
	filesystem: Filesystem,
): Promise<void> {
	const data = await filesystem
		.readFile(DEFAULT_SETTINGS_PATH)
		.then((raw) => JSON.parse(new TextDecoder().decode(raw)) as AppSettings)
		.catch(() => ({}));

	store.set(() => data);
}

/** Subscribe to the store and persist every change to disk. */
export function addPersistOnChange(
	store: SettingsStore,
	filesystem: Filesystem,
): () => void {
	return store.subscribe((value) => {
		void filesystem.writeFile(
			DEFAULT_SETTINGS_PATH,
			JSON.stringify(value, null, 2),
		);
	});
}
