import type { Platform } from '@franklin/agent/browser';
import { Plugin } from 'obsidian';

import { DiffController } from './diff/diff-controller.js';
import { createObsidianPlatform } from './platform/index.js';
import { FranklinView, VIEW_TYPE } from './view.js';

export default class FranklinPlugin extends Plugin {
	platform!: Platform;
	private diffController!: DiffController;

	async onload() {
		this.platform = createObsidianPlatform(this.app);
		this.diffController = new DiffController(this);
		this.diffController.onload();

		this.registerView(VIEW_TYPE, (leaf) => {
			return new FranklinView(leaf);
		});

		this.addRibbonIcon('bot', 'Open Franklin Placeholder', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-franklin-placeholder',
			name: 'Open Franklin Placeholder',
			callback: () => {
				void this.activateView();
			},
		});

		console.log('Franklin placeholder plugin loaded');
	}

	onunload() {
		this.diffController.onunload();
		console.log('Franklin placeholder plugin unloaded');
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
