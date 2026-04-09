import { Plugin } from 'obsidian';

import { FranklinView, VIEW_TYPE } from './view.js';

export default class FranklinPlugin extends Plugin {
	async onload() {
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
