import { Notice, Plugin } from 'obsidian';

import { createFranklinApp } from './app/app.js';
import { getDefaultAgent } from './app/agent.js';
import { DiffController } from './diff/diff-controller.js';
import { FranklinView, VIEW_TYPE } from './view.js';

export default class FranklinPlugin extends Plugin {
	private diffController!: DiffController;

	async onload() {
		this.diffController = new DiffController(this);
		this.diffController.onload();

		createFranklinApp(this)
			.then(({ app, vaultRoot }) =>
				getDefaultAgent(app, vaultRoot).then((runtime) => ({
					app,
					runtime,
				})),
			)
			.then(({ app, runtime }) => {
				this.registerView(VIEW_TYPE, (leaf) => {
					return new FranklinView(leaf, { app, runtime });
				});

				this.addRibbonIcon('bot', 'Open Franklin', () => {
					void this.activateView();
				});

				this.addCommand({
					id: 'open-franklin-placeholder',
					name: 'Open Franklin',
					callback: () => {
						void this.activateView();
					},
				});

				console.log('Franklin plugin loaded');
			})
			.catch((err: unknown) => {
				new Notice(
					`Franklin failed to load: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
	}

	onunload() {
		this.diffController.onunload();
		console.log('Franklin plugin unloaded');
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
