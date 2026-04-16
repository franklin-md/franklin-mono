import type { AbsolutePath, Filesystem } from '@franklin/lib';
import type { AppSettings } from '../settings/types.js';
import { createJsonStore } from './json.js';
import type { SettingsStore } from './types.js';

export const DEFAULT_SETTINGS_FILE = 'settings.json';

export const DEFAULT_APP_SETTINGS: AppSettings = {
	defaultLLMConfig: {
		provider: 'openai-codex',
		model: 'gpt-5.4',
		reasoning: 'medium',
	},
};

export function createSettingsStore(
	filesystem: Filesystem,
	appDir: AbsolutePath,
): SettingsStore {
	return createJsonStore(filesystem, appDir, {
		file: DEFAULT_SETTINGS_FILE,
		defaults: DEFAULT_APP_SETTINGS,
	});
}
