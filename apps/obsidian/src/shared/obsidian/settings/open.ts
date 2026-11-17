import type { App } from 'obsidian';
import type { SettingsSection } from './types.js';
import { openSettingsTab } from './open-tab.js';

const SETTINGS_UNAVAILABLE_NOTICE =
	'Open Franklin settings from Obsidian settings.';

export function openPluginSettings(
	app: App,
	pluginId: string,
	section?: SettingsSection,
): void {
	const setting = openSettingsTab(app, pluginId, SETTINGS_UNAVAILABLE_NOTICE);
	if (!setting) return;
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
