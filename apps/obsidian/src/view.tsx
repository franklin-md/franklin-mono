import { ItemView } from 'obsidian';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import { Placeholder } from './components/placeholder.js';

export const VIEW_TYPE = 'franklin-view';

export class FranklinView extends ItemView {
	private root: Root | null = null;

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

		this.root = createRoot(this.contentEl);
		this.root.render(createElement(Placeholder));
	}

	async onClose() {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}
