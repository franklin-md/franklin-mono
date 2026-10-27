import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import type { ReactNode } from 'react';
import { createMounter } from '../../renderer/mount.js';

export const INBOX_VIEW_TYPE = 'franklin-study-inbox';
type Options = { renderContent: () => ReactNode };

export class InboxView extends ItemView {
	private readonly mounter = createMounter();
	constructor(
		leaf: WorkspaceLeaf,
		private readonly options: Options,
	) {
		super(leaf);
	}
	getViewType() {
		return INBOX_VIEW_TYPE;
	}
	getDisplayText() {
		return 'Study inbox';
	}
	getIcon() {
		return 'inbox';
	}
	async onOpen() {
		this.contentEl.classList.add('franklin-inbox-view');
		this.mounter.mount(this.contentEl, this.options.renderContent());
	}
	async onClose() {
		this.contentEl.classList.remove('franklin-inbox-view');
		this.mounter.unmount();
	}
}
