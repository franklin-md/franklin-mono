import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';
import type { ReactNode } from 'react';

import { createMounter, type Mounter } from './renderer/mount.js';

export const VIEW_TYPE = 'franklin-view';

type FranklinViewOptions = {
	renderContent: () => ReactNode;
};

export class FranklinView extends ItemView {
	private readonly mounter: Mounter = createMounter();

	constructor(
		leaf: WorkspaceLeaf,
		private readonly options: FranklinViewOptions,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Franklin';
	}

	getIcon(): string {
		return 'bot';
	}

	async onOpen() {
		this.mounter.mount(this.contentEl, this.options.renderContent());
	}

	async onClose() {
		this.mounter.unmount();
	}
}
