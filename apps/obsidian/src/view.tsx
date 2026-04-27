import type { AgentCreateInput, FranklinApp } from '@franklin/agent/browser';
import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';

import { ConversationWindow } from './components/conversation-window/window.js';
import { createMounter, type Mounter } from './renderer/mount.js';

export const VIEW_TYPE = 'franklin-view';

type FranklinViewOptions = {
	app: FranklinApp;
	getCreateInput: () => AgentCreateInput;
};

export class FranklinView extends ItemView {
	private mounter: Mounter | null = null;

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
		this.mounter?.unmount();
		this.mounter = createMounter({
			children: (
				<ConversationWindow
					app={this.options.app}
					getCreateInput={this.options.getCreateInput}
				/>
			),
		});
		this.mounter.mount(this.contentEl);
	}

	async onClose() {
		this.mounter?.unmount();
		this.mounter = null;
	}
}
