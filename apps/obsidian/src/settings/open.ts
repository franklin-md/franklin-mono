import type { App } from 'obsidian';
import { openSettingsTab } from './open-settings-tab.js';

export function openPluginSettings(app: App, pluginId: string): void {
	openSettingsTab(
		app,
		pluginId,
		'Open Franklin settings from Obsidian settings.',
	);
}
