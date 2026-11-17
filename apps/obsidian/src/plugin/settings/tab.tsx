import { ApplicationProvider } from '@franklin/ui';
import { PluginSettingTab } from 'obsidian';

import type FranklinPlugin from '../../main.js';
import { createMounter, type Mounter } from '../../shared/ui/mount.js';
import type { SettingsSection } from '../../shared/obsidian/settings/types.js';

import { SettingsPage } from './page.js';

export class FranklinSettingTab extends PluginSettingTab {
	private section: SettingsSection = 'general';
	private readonly plugin: FranklinPlugin;
	private readonly mounter: Mounter = createMounter();

	constructor(plugin: FranklinPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	selectSection(section: SettingsSection): void {
		this.section = section;
		this.display();
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
				<SettingsPage
					initialSection={this.section}
					onSectionChange={(section) => {
						this.section = section;
					}}
				/>
			</ApplicationProvider>,
		);
	}

	hide(): void {
		this.mounter.unmount();
	}
}
