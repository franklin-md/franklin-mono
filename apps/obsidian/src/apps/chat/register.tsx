import type { FranklinApp } from '@franklin/agent';
import type { AgentCreateInput, HostActionBinding } from '@franklin/react';
import type { Plugin } from 'obsidian';

import { activateView } from '../../shared/obsidian/activate-view.js';
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
	plugin.registerView(VIEW_TYPE, (leaf) => {
		return new FranklinView(leaf, {
			renderContent: () =>
				createFranklinViewContent({
					app,
					getCreateInput,
					hostActionBindings,
					obsidianApp: plugin.app,
					pluginId: plugin.manifest.id,
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
