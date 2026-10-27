import type { App } from 'obsidian';
import { openSettingsTab } from './open-settings-tab.js';

const COMMAND_QUERY = 'Add selection to study inbox';

export function openInboxHotkeys(app: App): void {
	const setting = openSettingsTab(
		app,
		'hotkeys',
		`Open Obsidian Settings → Hotkeys and search for “${COMMAND_QUERY}”.`,
	);
	if (!setting) return;

	// Obsidian's settings/search API is internal, just like openPluginSettings.
	// Keep the native hotkey editor authoritative for storage and conflicts;
	// filtering is optional so a host API change still opens the usable editor.
	const tab = setting.activeTab;
	if (isSearchTab(tab)) tab.setQuery(COMMAND_QUERY);
}

function isSearchTab(
	value: unknown,
): value is { setQuery: (query: string) => void } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'setQuery' in value &&
		typeof value.setQuery === 'function'
	);
}
