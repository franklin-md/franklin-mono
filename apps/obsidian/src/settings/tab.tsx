import { AppContext, HostActionProvider } from '@franklin/react';
import { PluginSettingTab } from 'obsidian';

import type FranklinPlugin from '../main.js';
import { createMounter, type Mounter } from '../renderer/mount.js';

import { SettingsPage } from './page.js';

export class FranklinSettingTab extends PluginSettingTab {
	private readonly plugin: FranklinPlugin;
	private readonly mounter: Mounter = createMounter();

	constructor(plugin: FranklinPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.mounter.mount(
			this.containerEl,
			<HostActionProvider bindings={this.plugin.hostActionBindings}>
				<AppContext.Provider value={this.plugin.franklinApp}>
					<SettingsPage />
				</AppContext.Provider>
			</HostActionProvider>,
		);
	}

	hide(): void {
		this.mounter.unmount();
	}
}
