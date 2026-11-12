import type { App } from 'obsidian';
import { Notice } from 'obsidian';

type SettingsApi = {
	open: () => void;
	openTabById: (tabId: string) => void;
	activeTab?: unknown;
};

export function openSettingsTab(
	app: App,
	tabId: string,
	unavailableNotice: string,
): SettingsApi | undefined {
	const { setting } = app as App & { setting?: unknown };
	if (!isSettingsApi(setting)) {
		new Notice(unavailableNotice);
		return;
	}
	setting.open();
	setting.openTabById(tabId);
	return setting;
}

function isSettingsApi(value: unknown): value is SettingsApi {
	return (
		typeof value === 'object' &&
		value !== null &&
		'open' in value &&
		typeof value.open === 'function' &&
		'openTabById' in value &&
		typeof value.openTabById === 'function'
	);
}
