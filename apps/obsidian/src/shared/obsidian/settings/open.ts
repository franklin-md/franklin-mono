import type { App } from 'obsidian';
import { Notice } from 'obsidian';

type ObsidianSettingApi = {
	open: () => void;
	openTabById: (tabId: string) => void;
};

type AppWithInternalSettings = App & {
	setting?: unknown;
};

const SETTINGS_UNAVAILABLE_NOTICE =
	'Open Franklin settings from Obsidian settings.';

export function openPluginSettings(app: App, pluginId: string): void {
	const { setting } = app as AppWithInternalSettings;
	if (!isObsidianSettingApi(setting)) {
		new Notice(SETTINGS_UNAVAILABLE_NOTICE);
		return;
	}

	setting.open();
	setting.openTabById(pluginId);
}

function isObsidianSettingApi(value: unknown): value is ObsidianSettingApi {
	return (
		typeof value === 'object' &&
		value !== null &&
		'open' in value &&
		typeof value.open === 'function' &&
		'openTabById' in value &&
		typeof value.openTabById === 'function'
	);
}
