import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import { Notice, Plugin } from 'obsidian';

import { registerChat } from './apps/chat/register.js';
import { bootstrapPlugin } from './plugin/bootstrap.js';
import { registerReactScan } from './dev/react-scan.js';
import { ObsidianDiffClient } from './shared/diff/client.js';
import { DiffController } from './shared/diff/controller.js';
import { DiffExplorerController } from './shared/diff/explorer.js';
import { clearPortalRoot } from './shared/ui/portal.js';
import { FranklinSettingTab } from './plugin/settings/tab.js';
import { DirectiveRegistry } from './shared/directives/registry.js';
import { createDirectivePersistence } from './shared/directives/storage/persistence.js';
import { getPluginAbsolutePath } from './shared/obsidian/path.js';
import { editorAnchors } from './shared/obsidian/editor/anchors.js';
import { createDirectiveExtension } from './shared/directives/live-preview/extension.js';
import { createDirectivePostProcessor } from './shared/directives/reading/processor.js';

export default class FranklinPlugin extends Plugin {
	private diffController: DiffController | null = null;
	private diffExplorerController: DiffExplorerController | null = null;
	private unloading = false;
	private directives?: DirectiveRegistry;
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
				this.registerEditorExtension(editorAnchors);

				this.addSettingTab(new FranklinSettingTab(this));

				registerChat({
					plugin: this,
					app,
					getCreateInput,
					hostActionBindings,
				});
				return this.loadDirectives();
			})
			.catch((err: unknown) => {
				if (this.unloading) return;
				console.error(err);
				new Notice(
					`Franklin failed to load: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
	}

	private async loadDirectives(): Promise<void> {
		try {
			const dir = getPluginAbsolutePath(this.app.vault, this.manifest);
			const registry = await DirectiveRegistry.create({
				app: this.app,
				persistence: createDirectivePersistence({
					path: joinAbsolute(toAbsolutePath(dir), 'directives.json'),
				}),
			});
			if (this.unloading) {
				await registry.dispose();
				return;
			}
			this.directives = registry;
			this.registerEditorExtension(createDirectiveExtension(registry));
			this.registerMarkdownPostProcessor(
				createDirectivePostProcessor(registry),
			);
		} catch (error) {
			if (!this.unloading)
				new Notice(`Franklin directives failed to load: ${String(error)}`);
		}
	}

	onunload() {
		this.unloading = true;
		void this.directives?.dispose();
		this.directives = undefined;
		this.diffExplorerController?.onunload();
		this.diffController?.onunload();
		this.disposeFranklinApp?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.hostActionBindings = [];
		this.disposeFranklinApp = null;
	}
}
