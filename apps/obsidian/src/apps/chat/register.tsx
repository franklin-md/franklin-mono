import type { FranklinApp } from '@franklin/agent';
import type { AgentCreateInput, HostActionBinding } from '@franklin/react';
import type { Plugin } from 'obsidian';

import { activateView } from '../../shared/obsidian/activate-view.js';
import { openPluginSettings } from '../../shared/obsidian/settings/open.js';
import { createFranklinViewContent } from './ui/content.js';
import { FranklinView, VIEW_TYPE } from './view.js';

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

	const activate = () => {
		void activateView(plugin.app.workspace, VIEW_TYPE);
	};
	plugin.addRibbonIcon('bot', 'Open Franklin', activate);

	plugin.addCommand({
		id: 'open-chat-window',
		name: 'Open chat window',
		callback: activate,
	});
}
