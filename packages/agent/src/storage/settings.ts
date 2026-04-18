import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { DEFAULT_APP_SETTINGS, appSettingsCodec } from '../settings/schema.js';
import { createJsonStore } from './json.js';
import type { SettingsStore } from './types.js';

export const DEFAULT_SETTINGS_FILE = 'settings.json';

export function createSettingsStore(
	filesystem: Filesystem,
	appDir: AbsolutePath,
): SettingsStore {
	return createJsonStore(filesystem, appDir, {
		file: DEFAULT_SETTINGS_FILE,
		defaults: DEFAULT_APP_SETTINGS,
		codec: appSettingsCodec,
	});
}
