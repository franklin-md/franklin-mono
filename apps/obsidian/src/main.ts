import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { Notice, Plugin } from 'obsidian';

import { registerChat } from './apps/chat/register.js';
import { bootstrapPlugin } from './plugin/bootstrap.js';
import { registerReactScan } from './dev/react-scan.js';
import { ObsidianDiffClient } from './shared/diff/client.js';
import { DiffController } from './shared/diff/controller.js';
import { DiffExplorerController } from './shared/diff/explorer.js';
import { clearPortalRoot } from './shared/ui/portal.js';
import { FranklinSettingTab } from './plugin/settings/tab.js';

export default class FranklinPlugin extends Plugin {
	private diffController: DiffController | null = null;
	private diffExplorerController: DiffExplorerController | null = null;
	private unloading = false;
	private disposeFranklinApp: (() => void) | null = null;
	franklinApp: FranklinApp | null = null;
	hostActionBindings: readonly HostActionBinding[] = [];

	async onload() {
		await registerReactScan();
		if (this.unloading) return;

		const diffClient = new ObsidianDiffClient(this.app.vault, this.manifest);
		this.diffController = new DiffController(this, diffClient);
		this.diffExplorerController = new DiffExplorerController(this, diffClient);
		this.diffController.onload();
		this.diffExplorerController.onload();

		bootstrapPlugin(this, diffClient)
			.then((runtime) => {
				const { app, getCreateInput, hostActionBindings } = runtime;
				// Startup may finish after Obsidian has unloaded this instance.
				if (this.unloading) {
					runtime.dispose();
					return;
				}
				this.franklinApp = app;
				this.hostActionBindings = hostActionBindings;
				this.disposeFranklinApp = () => runtime.dispose();

				this.addSettingTab(new FranklinSettingTab(this));

				registerChat({
					plugin: this,
					app,
					getCreateInput,
					hostActionBindings,
				});
			})
			.catch((err: unknown) => {
				if (this.unloading) return;
				console.error(err);
				new Notice(
					`Franklin failed to load: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
	}

	onunload() {
		this.unloading = true;
		this.diffExplorerController?.onunload();
		this.diffController?.onunload();
		this.disposeFranklinApp?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.hostActionBindings = [];
		this.disposeFranklinApp = null;
	}
}
