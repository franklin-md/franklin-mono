import type { AgentCreateInput, FranklinApp } from '@franklin/agent/browser';
import { AppContext } from '@franklin/react';
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
		this.mounter.mount(
			this.contentEl,
			<AppContext.Provider value={this.options.app}>
				<ConversationWindow getCreateInput={this.options.getCreateInput} />
			</AppContext.Provider>,
		);
	}

	async onClose() {
		this.mounter.unmount();
	}
}
