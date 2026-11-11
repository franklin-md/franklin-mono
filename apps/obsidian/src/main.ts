import type { MCPConnections } from '@franklin/extension-mcp';
import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { Notice, Plugin } from 'obsidian';

import { bootstrapPlugin } from './plugin/bootstrap.js';
import { registerChat } from './apps/chat/register.js';
import { registerReactScan } from './dev/react-scan.js';
import { ObsidianDiffClient } from './shared/diff/client.js';
import { DiffController } from './shared/diff/controller.js';
import { DiffExplorerController } from './shared/diff/explorer.js';
import { clearPortalRoot } from './shared/ui/portal.js';
import { FranklinSettingTab } from './plugin/settings/tab.js';
import { registerInbox } from './apps/inbox/register.js';
import type { InboxController } from './apps/inbox/controller/controller.js';

export default class FranklinPlugin extends Plugin {
	private diffClient!: ObsidianDiffClient;
	private diffController!: DiffController;
	private diffExplorerController!: DiffExplorerController;
	private unloading = false;
	private disposeFranklinApp: (() => void) | null = null;
	franklinApp: FranklinApp | null = null;
	connections: MCPConnections | null = null;
	inbox: InboxController | null = null;
	hostActionBindings: readonly HostActionBinding[] = [];

	async onload() {
		await registerReactScan();

		this.diffClient = new ObsidianDiffClient(this.app.vault, this.manifest);
		this.diffController = new DiffController(this, this.diffClient);
		this.diffExplorerController = new DiffExplorerController(
			this,
			this.diffClient,
		);
		this.diffController.onload();
		this.diffExplorerController.onload();

		bootstrapPlugin(this, this.diffClient)
			.then(
				({
					app,
					connections,
					inbox,
					getCreateInput,
					hostActionBindings,
					dispose: disposeFranklinApp,
				}) => {
					if (this.unloading) {
						disposeFranklinApp();
						return;
					}
					registerInbox({ plugin: this, app, inbox, hostActionBindings });
					this.franklinApp = app;
					this.connections = connections;
					this.inbox = inbox;
					this.hostActionBindings = hostActionBindings;
					this.disposeFranklinApp = disposeFranklinApp;

					this.addSettingTab(new FranklinSettingTab(this));

					registerChat({
						plugin: this,
						app,
						getCreateInput,
						hostActionBindings,
					});
				},
			)
			.catch((err: unknown) => {
				console.error(err);
				new Notice(
					`Franklin failed to load: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
	}

	onunload() {
		this.unloading = true;
		this.diffExplorerController.onunload();
		this.diffController.onunload();
		this.disposeFranklinApp?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.connections = null;
		this.inbox = null;
		this.hostActionBindings = [];
		this.disposeFranklinApp = null;
	}
}
