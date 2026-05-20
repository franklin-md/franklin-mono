import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { Notice, Plugin } from 'obsidian';

import { createObsidianSessionInput } from './app/agent.js';
import { createFranklinApp } from './app/app.js';
import { createFranklinViewContent } from './components/franklin-view-content.js';
import { registerReactScan } from './dev/react-scan.js';
import { ObsidianDiffClient } from './diff/client.js';
import { DiffController } from './diff/controller.js';
import { DiffExplorerController } from './diff/explorer.js';
import { clearPortalRoot } from './renderer/portal.js';
import { openPluginSettings } from './settings/open.js';
import { FranklinSettingTab } from './settings/tab.js';
import { FranklinView, VIEW_TYPE } from './view.js';

export default class FranklinPlugin extends Plugin {
	private diffClient!: ObsidianDiffClient;
	private diffController!: DiffController;
	private diffExplorerController!: DiffExplorerController;
	private disposeFranklinApp: (() => void) | null = null;
	franklinApp: FranklinApp | null = null;
	hostActionBindings: readonly HostActionBinding[] = [];

	async onload() {
		await registerReactScan();

		this.diffClient = new ObsidianDiffClient(this.app.vault, this.manifest);
		this.diffController = new DiffController(this, this.diffClient);
		this.diffExplorerController = new DiffExplorerController(
			this,
			this.diffClient,
		);
		this.diffController.onload();
		this.diffExplorerController.onload();

		createFranklinApp(this, this.diffClient)
			.then(async (result) => {
				const { app, vaultRoot } = result;
				const getCreateInput = () =>
					createObsidianSessionInput(app, vaultRoot, this.app.vault.configDir);

				if (app.agents.list().length === 0) {
					await app.agents.create(getCreateInput());
				}

				return {
					app,
					getCreateInput,
					hostActionBindings: result.hostActionBindings,
					disposeFranklinApp: () => result.dispose(),
				};
			})
			.then(
				({ app, getCreateInput, hostActionBindings, disposeFranklinApp }) => {
					this.franklinApp = app;
					this.hostActionBindings = hostActionBindings;
					this.disposeFranklinApp = disposeFranklinApp;

					this.addSettingTab(new FranklinSettingTab(this));

					const requestApiKey = () => {
						openPluginSettings(this.app, this.manifest.id);
					};

					this.registerView(VIEW_TYPE, (leaf) => {
						return new FranklinView(leaf, {
							renderContent: () =>
								createFranklinViewContent({
									app,
									getCreateInput,
									hostActionBindings,
									obsidianApp: this.app,
									requestApiKey,
								}),
						});
					});

					this.addRibbonIcon('bot', 'Open Franklin', () => {
						void this.activateView();
					});

					this.addCommand({
						id: 'open-chat-window',
						name: 'Open chat window',
						callback: () => {
							void this.activateView();
						},
					});
				},
			)
			.catch((err: unknown) => {
				console.error(err);
				new Notice(
					`Franklin failed to load: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
	}

	onunload() {
		this.diffExplorerController.onunload();
		this.diffController.onunload();
		this.disposeFranklinApp?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.hostActionBindings = [];
		this.disposeFranklinApp = null;
	}

	private async activateView() {
		const { workspace } = this.app;
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
