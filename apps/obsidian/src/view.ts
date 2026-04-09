import { ItemView } from 'obsidian';

export const VIEW_TYPE = 'franklin-view';

export class FranklinView extends ItemView {
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

		const shell = this.contentEl.createDiv({ cls: 'franklin-shell' });
		const card = shell.createDiv({ cls: 'franklin-card' });
		card.createEl('p', { cls: 'franklin-kicker', text: 'Franklin' });
		card.createEl('h2', {
			cls: 'franklin-title',
			text: 'Obsidian plugin shell',
		});
		card.createEl('p', {
			cls: 'franklin-copy',
			text: 'This placeholder keeps the Obsidian plugin build, bundle, and vault deploy workflow in place without depending on Franklin runtime packages yet.',
		});
	}

	async onClose() {
		this.contentEl.empty();
	}
}
