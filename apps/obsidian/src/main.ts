import { Notice, Plugin } from 'obsidian';
import type { FranklinApp } from '@franklin/agent/browser';

import { createFranklinApp } from './app/app.js';
import { getDefaultAgent } from './app/agent.js';
import { ObsidianDiffClient } from './diff/diff-client.js';
import { DiffController } from './diff/diff-controller.js';
import { DiffExplorerController } from './diff/diff-explorer-controller.js';
import { FranklinSettingTab } from './settings.js';
import { FranklinView, VIEW_TYPE } from './view.js';

export default class FranklinPlugin extends Plugin {
	private diffClient!: ObsidianDiffClient;
	private diffController!: DiffController;
	private diffExplorerController!: DiffExplorerController;
	franklinApp: FranklinApp | null = null;

	async onload() {
		this.diffClient = new ObsidianDiffClient(this.app.vault, this.manifest);
		this.diffController = new DiffController(this, this.diffClient);
		this.diffExplorerController = new DiffExplorerController(
			this,
			this.diffClient,
		);
		this.diffController.onload();
		this.diffExplorerController.onload();

		this.addSettingTab(new FranklinSettingTab(this.app, this));

		createFranklinApp(this, this.diffClient)
			.then(({ app, vaultRoot }) =>
				getDefaultAgent(app, vaultRoot, this.app.vault.configDir).then(
					(runtime) => ({
						app,
						runtime,
					}),
				),
			)
			.then(({ app, runtime }) => {
				this.franklinApp = app;

				this.registerView(VIEW_TYPE, (leaf) => {
					return new FranklinView(leaf, { app, runtime });
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
