import type { Plugin } from 'obsidian';
import { openSettingsTab } from '../../../shared/obsidian/settings/open-tab.js';

type SearchTab = { setQuery: (query: string) => void };

export function openQuickEditHotkeys(plugin: Plugin): void {
	const tab = openSettingsTab(
		plugin.app,
		'hotkeys',
		'Open Obsidian Settings → Hotkeys and search for “Franklin: Quick edit”.',
	)?.activeTab;
	if (isSearchTab(tab)) tab.setQuery('Franklin: Quick edit');
}

function isSearchTab(value: unknown): value is SearchTab {
	return (
		typeof value === 'object' &&
		value !== null &&
		'setQuery' in value &&
		typeof value.setQuery === 'function'
	);
}
