import type { FranklinApp, FranklinSystem } from '@franklin/agent/browser';
import type { SessionCreateInput } from '@franklin/extensions';
import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';

import { mountConversationWindow } from './components/conversation-window/mount.js';

export const VIEW_TYPE = 'franklin-view';

type FranklinViewOptions = {
	app: FranklinApp;
	getCreateAgentOverrides: () => NonNullable<
		SessionCreateInput<FranklinSystem>['overrides']
	>;
};

export class FranklinView extends ItemView {
	private unmountWindow: (() => void) | null = null;

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
		this.unmountWindow?.();
		this.unmountWindow = mountConversationWindow({
			app: this.options.app,
			contentEl: this.contentEl,
			getCreateAgentOverrides: this.options.getCreateAgentOverrides,
		});
	}

	async onClose() {
		this.unmountWindow?.();
		this.unmountWindow = null;
	}
}
