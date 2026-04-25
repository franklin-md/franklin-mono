import { PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';

import type FranklinPlugin from './main.js';

const OPENROUTER_PROVIDER = 'openrouter';

export class FranklinSettingTab extends PluginSettingTab {
	private readonly plugin: FranklinPlugin;

	constructor(obsidianApp: App, plugin: FranklinPlugin) {
		super(obsidianApp, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const franklinApp = this.plugin.franklinApp;
		if (!franklinApp) {
			containerEl.createEl('p', {
				text: 'Franklin is still loading. Please close and reopen settings.',
			});
			return;
		}

		const currentKey =
			franklinApp.auth.entries()[OPENROUTER_PROVIDER]?.apiKey?.key ?? '';

		new Setting(containerEl)
			.setName('OpenRouter API key')
			.setDesc('Your OpenRouter API key for LLM access.')
			.addText((text) => {
				text.inputEl.type = 'password';
				text.inputEl.style.width = '300px';
				text
					.setPlaceholder('sk-or-...')
					.setValue(currentKey)
					.onChange((value) => {
						const trimmed = value.trim();
						if (trimmed) {
							franklinApp.auth.setApiKeyEntry(OPENROUTER_PROVIDER, {
								type: 'apiKey',
								key: trimmed,
							});
						} else {
							franklinApp.auth.removeApiKeyEntry(OPENROUTER_PROVIDER);
						}
					});
			});
	}
}
