import { ApplicationProvider } from '@franklin/ui';
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
		const franklinApp = this.plugin.franklinApp;
		if (!franklinApp) {
			this.containerEl.empty();
			return;
		}

		this.mounter.mount(
			this.containerEl,
			<ApplicationProvider
				harness={franklinApp}
				hostActionBindings={this.plugin.hostActionBindings}
			>
				<SettingsPage />
			</ApplicationProvider>,
		);
	}

	hide(): void {
		this.mounter.unmount();
	}
}
