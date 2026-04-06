import { createStore } from '@franklin/extensions';
import type { Store } from '@franklin/extensions';
import type { Filesystem } from '@franklin/lib';
import type { AppSettings } from './types.js';

export const DEFAULT_SETTINGS_PATH = 'settings.json';
export const DEFAULT_APP_SETTINGS: AppSettings = {
	defaultLLMConfig: {
		provider: 'openai-codex',
		model: 'gpt-5.4',
		reasoning: 'medium',
	},
};

export type SettingsStore = Store<AppSettings>;

/** Create an in-memory settings store with app defaults. */
export function createSettings(): SettingsStore {
	return createStore(DEFAULT_APP_SETTINGS);
}

/** Load persisted settings from disk into the store. */
export async function loadSettings(
	store: SettingsStore,
	filesystem: Filesystem,
): Promise<void> {
	const data = await filesystem
		.readFile(DEFAULT_SETTINGS_PATH)
		.then((raw) => JSON.parse(new TextDecoder().decode(raw)) as AppSettings)
		.catch(() => ({}) as AppSettings);

	store.set(() => ({
		...DEFAULT_APP_SETTINGS,
		...data,
	}));
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
