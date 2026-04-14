import {
	createPersistedStore,
	createStore,
	type PersistedStore,
} from '@franklin/extensions';
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

export type SettingsStore = PersistedStore<AppSettings>;

export function createSettings(filesystem: Filesystem): SettingsStore {
	return createPersistedStore(createStore(DEFAULT_APP_SETTINGS), {
		async restore(): Promise<AppSettings> {
			const data = await filesystem
				.readFile(DEFAULT_SETTINGS_PATH)
				.then((raw) => JSON.parse(new TextDecoder().decode(raw)) as AppSettings)
				.catch(() => ({}) as AppSettings);

			return {
				...DEFAULT_APP_SETTINGS,
				...data,
			};
		},
		async persist(value): Promise<void> {
			await filesystem.writeFile(
				DEFAULT_SETTINGS_PATH,
				JSON.stringify(value, null, 2),
			);
		},
		isEqual: areSettingsEqual,
	});
}

function areSettingsEqual(left: AppSettings, right: AppSettings): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}
