import type { FranklinApp, FranklinRuntime } from '@franklin/agent/browser';
import { PortalContainerProvider } from '@franklin/ui';
import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import { ObsidianApp } from './components/app.js';

export const VIEW_TYPE = 'franklin-view';

export class FranklinView extends ItemView {
	private root: Root | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly options: {
			app: FranklinApp;
			runtime: FranklinRuntime;
		},
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
		this.contentEl.empty();
		this.contentEl.addClass('franklin');
		this.contentEl.style.height = '100%';

		const root = createRoot(this.contentEl);
		this.root = root;
		root.render(
			<PortalContainerProvider value={this.contentEl}>
				<ObsidianApp app={this.options.app} runtime={this.options.runtime} />
			</PortalContainerProvider>,
		);
	}

	async onClose() {
		this.root?.unmount();
		this.root = null;
		this.contentEl.style.removeProperty('height');
		this.contentEl.empty();
	}
}
