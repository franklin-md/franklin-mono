import type { App } from 'obsidian';
import type { SettingsSection } from './types.js';
import { openSettingsTab } from './open-tab.js';

export function openPluginSettings(
	app: App,
	pluginId: string,
	section?: SettingsSection,
): void {
	const settings = openSettingsTab(
		app,
		pluginId,
		'Open Franklin settings from Obsidian settings.',
	);
	const tab = settings?.activeTab;
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
