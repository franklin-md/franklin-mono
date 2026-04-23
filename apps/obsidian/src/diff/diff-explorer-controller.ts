import type { Plugin } from 'obsidian';

import type { DiffClient } from './diff-client.js';

const FILE_EXPLORER_VIEW_TYPE = 'file-explorer';
const NEW_FILE_ROW_CLASS = 'diff-plugin-unopened-new-file';
const FILE_ROW_SELECTOR = '.nav-file-title[data-path]';

export class DiffExplorerController {
	private observers = new Map<HTMLElement, MutationObserver>();
	private syncQueued = false;
	private unloaded = false;

	constructor(
		private readonly plugin: Plugin,
		private readonly client: DiffClient,
	) {}

	onload() {
		const scheduleSync = () => {
			void this.scheduleSync();
		};

		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', scheduleSync),
		);
		this.plugin.register(this.client.onEntryChanged(scheduleSync));

		this.plugin.app.workspace.onLayoutReady(() => {
			void this.scheduleSync();
		});
	}

	onunload() {
		this.unloaded = true;

		for (const [container, observer] of this.observers) {
			observer.disconnect();
			this.clearContainer(container);
		}

		this.observers.clear();
	}

	private async scheduleSync(): Promise<void> {
		if (this.syncQueued || this.unloaded) return;

		this.syncQueued = true;
		await Promise.resolve();
		this.syncQueued = false;

		this.syncObservers();
		await this.syncExplorerRows();
	}

	private syncObservers() {
		const containers = new Set<HTMLElement>();

		for (const leaf of this.plugin.app.workspace.getLeavesOfType(
			FILE_EXPLORER_VIEW_TYPE,
		)) {
			const container = leaf.view.containerEl;
			containers.add(container);
			if (this.observers.has(container)) continue;

			const observer = new MutationObserver(() => {
				void this.scheduleSync();
			});
			observer.observe(container, {
				childList: true,
				subtree: true,
			});
			this.observers.set(container, observer);
		}

		for (const [container, observer] of this.observers) {
			if (containers.has(container) && container.isConnected) continue;
			observer.disconnect();
			this.clearContainer(container);
			this.observers.delete(container);
		}
	}

	private async syncExplorerRows(): Promise<void> {
		const unopenedNewFiles = new Set(await this.client.listUnopenedNewFiles());

		for (const leaf of this.plugin.app.workspace.getLeavesOfType(
			FILE_EXPLORER_VIEW_TYPE,
		)) {
			const rows =
				leaf.view.containerEl.querySelectorAll<HTMLElement>(FILE_ROW_SELECTOR);

			for (const row of rows) {
				row.classList.toggle(
					NEW_FILE_ROW_CLASS,
					unopenedNewFiles.has(row.dataset.path ?? ''),
				);
			}
		}
	}

	private clearContainer(container: HTMLElement) {
		for (const row of container.querySelectorAll<HTMLElement>(
			FILE_ROW_SELECTOR,
		)) {
			row.classList.remove(NEW_FILE_ROW_CLASS);
		}
	}
}
