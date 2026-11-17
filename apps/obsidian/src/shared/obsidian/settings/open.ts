import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import type { SettingsSection } from './types.js';

type ObsidianSettingApi = {
	open: () => void;
	openTabById: (tabId: string) => void;
	activeTab?: unknown;
};

type AppWithInternalSettings = App & {
	setting?: unknown;
};

const SETTINGS_UNAVAILABLE_NOTICE =
	'Open Franklin settings from Obsidian settings.';

export function openPluginSettings(
	app: App,
	pluginId: string,
	section?: SettingsSection,
): void {
	const { setting } = app as AppWithInternalSettings;
	if (!isObsidianSettingApi(setting)) {
		new Notice(SETTINGS_UNAVAILABLE_NOTICE);
		return;
	}

	setting.open();
	setting.openTabById(pluginId);
	const tab = setting.activeTab;
	if (
		section &&
		typeof tab === 'object' &&
		tab !== null &&
		'selectSection' in tab &&
		typeof tab.selectSection === 'function'
	) {
		const selectSection = tab.selectSection as (
			section: SettingsSection,
		) => void;
		selectSection.call(tab, section);
	}
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
