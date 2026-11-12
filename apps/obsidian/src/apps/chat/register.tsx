import type { FranklinApp } from '@franklin/agent';
import type { AgentCreateInput, HostActionBinding } from '@franklin/react';
import type { Plugin } from 'obsidian';
import { createFranklinViewContent } from './ui/content.js';
import { FranklinView, VIEW_TYPE } from './view.js';
import { openPluginSettings } from '../../shared/obsidian/settings/open.js';

type Options = {
	plugin: Plugin;
	app: FranklinApp;
	getCreateInput: () => AgentCreateInput;
	hostActionBindings: readonly HostActionBinding[];
};

export function registerChat({
	plugin,
	app,
	getCreateInput,
	hostActionBindings,
}: Options): void {
	const requestApiKey = () => {
		openPluginSettings(plugin.app, plugin.manifest.id, 'connections');
	};

	plugin.registerView(VIEW_TYPE, (leaf) => {
		return new FranklinView(leaf, {
			renderContent: () =>
				createFranklinViewContent({
					app,
					getCreateInput,
					hostActionBindings,
					obsidianApp: plugin.app,
					requestApiKey,
				}),
		});
	});

	plugin.addRibbonIcon('bot', 'Open Franklin', () => {
		void activate();
	});

	plugin.addCommand({
		id: 'open-chat-window',
		name: 'Open chat window',
		callback: () => {
			void activate();
		},
	});
	async function activate() {
		const { workspace } = plugin.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE);
		const first = existing[0];
		if (first) {
			await workspace.revealLeaf(first);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
			await workspace.revealLeaf(leaf);
		}
	}
}
