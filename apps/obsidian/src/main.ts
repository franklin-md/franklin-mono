import type { FranklinApp } from '@franklin/agent/browser';
import { Notice, Plugin } from 'obsidian';

import { createObsidianSessionInput } from './app/agent.js';
import { createFranklinApp } from './app/app.js';
import { createFranklinViewContent } from './components/franklin-view-content.js';
import { registerReactScan } from './dev/react-scan.js';
import { ObsidianDiffClient } from './diff/diff-client.js';
import { DiffController } from './diff/diff-controller.js';
import { DiffExplorerController } from './diff/diff-explorer-controller.js';
import { clearPortalRoot } from './renderer/portal.js';
import { openPluginSettings } from './settings/open.js';
import { FranklinSettingTab } from './settings/tab.js';
import { FranklinView, VIEW_TYPE } from './view.js';

export default class FranklinPlugin extends Plugin {
	private diffClient!: ObsidianDiffClient;
	private diffController!: DiffController;
	private diffExplorerController!: DiffExplorerController;
	franklinApp: FranklinApp | null = null;

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
			.then(async ({ app, vaultRoot }) => {
				const getCreateInput = () =>
					createObsidianSessionInput(app, vaultRoot, this.app.vault.configDir);

				if (app.agents.list().length === 0) {
					await app.agents.create(getCreateInput());
				}

				return { app, getCreateInput };
			})
			.then(({ app, getCreateInput }) => {
				this.franklinApp = app;

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
								requestApiKey,
							}),
					});
				});

				this.addRibbonIcon('bot', 'Open Franklin', () => {
					void this.activateView();
				});

				this.addCommand({
					id: 'open-franklin',
					name: 'Open Franklin',
					callback: () => {
						void this.activateView();
					},
				});
			})
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
		clearPortalRoot(document);
		this.franklinApp = null;
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
