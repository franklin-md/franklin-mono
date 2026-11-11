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
import { createDirectiveExtension } from './shared/directives/live-preview/extension.js';
import { createDirectivePostProcessor } from './shared/directives/reading/processor.js';
import type { InboxController } from './apps/inbox/controller/controller.js';
import { registerQuickEdit } from './apps/quick-edit/register.js';
import type { QuickEditPreferences } from './apps/quick-edit/settings/store.js';

export default class FranklinPlugin extends Plugin {
	private diffClient!: ObsidianDiffClient;
	private diffController!: DiffController;
	private diffExplorerController!: DiffExplorerController;
	private unloading = false;
	private disposeFranklinApp: (() => void) | null = null;
	franklinApp: FranklinApp | null = null;
	inbox: InboxController | null = null;
	quickEditPreferences: QuickEditPreferences | null = null;
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
				async ({
					app,
					inbox,
					directives,
					getCreateInput,
					hostActionBindings,
					dispose: disposeFranklinApp,
				}) => {
					if (this.isUnloading()) {
						disposeFranklinApp();
						return;
					}
					this.registerEditorExtension(createDirectiveExtension(directives));
					this.registerMarkdownPostProcessor(
						createDirectivePostProcessor(directives),
					);
					const disposeInbox = registerInbox({
						plugin: this,
						app,
						inbox,
						directives,
						hostActionBindings,
					});
					const quickEdit = await registerQuickEdit({
						plugin: this,
						franklin: app,
						registry: directives,
						diff: this.diffClient,
					});
					if (this.isUnloading()) {
						await Promise.all([quickEdit.dispose(), disposeInbox()]);
						disposeFranklinApp();
						return;
					}
					this.franklinApp = app;
					this.inbox = inbox;
					this.quickEditPreferences = quickEdit.preferences;
					this.hostActionBindings = hostActionBindings;
					this.disposeFranklinApp = () => {
						void Promise.all([quickEdit.dispose(), disposeInbox()]).finally(
							disposeFranklinApp,
						);
					};

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

	private isUnloading(): boolean {
		return this.unloading;
	}

	onunload() {
		this.unloading = true;
		this.diffExplorerController.onunload();
		this.diffController.onunload();
		this.disposeFranklinApp?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.inbox = null;
		this.quickEditPreferences = null;
		this.hostActionBindings = [];
		this.disposeFranklinApp = null;
	}
}
