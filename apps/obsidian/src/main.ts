import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import { Notice, Plugin } from 'obsidian';

import { registerChat } from './apps/chat/register.js';
import { errorMessage } from './apps/inbox/controller/error.js';
import { registerInbox } from './apps/inbox/register.js';
import { registerQuickEdit } from './apps/quick-edit/register.js';
import { bootstrapPlugin } from './plugin/bootstrap.js';
import type { PluginRuntime } from './plugin/bootstrap.js';
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
	private disposeInbox: (() => void) | null = null;
	private readonly quickEditLifetime = new AbortController();
	private disposeQuickEdit?: () => Promise<void>;
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
				// Startup may finish after Obsidian has unloaded this instance.
				if (this.unloading) return;
				const { app, getCreateInput, hostActionBindings } = runtime;
				this.franklinApp = app;
				this.hostActionBindings = hostActionBindings;
				this.registerEditorExtension(editorAnchors);

				const settings = new FranklinSettingTab(this);
				this.addSettingTab(settings);
				registerChat({
					plugin: this,
					app,
					getCreateInput,
					hostActionBindings,
				});

				return Promise.all([
					this.loadInbox(runtime, settings),
					this.loadQuickEdit(app, settings, diffClient),
				]);
			})
			.catch((err: unknown) => {
				if (this.unloading) return;
				console.error(err);
				new Notice(`Franklin failed to load: ${errorMessage(err)}`);
			});
	}

	private async loadInbox(
		{ app, hostActionBindings, startInbox }: PluginRuntime,
		settings: FranklinSettingTab,
	) {
		try {
			const { ready, dispose } = startInbox();
			this.disposeInbox = () => {
				void dispose().catch((error: unknown) => {
					new Notice(`Inbox shutdown: ${errorMessage(error)}`);
				});
				settings.setInbox(null);
			};
			const inbox = await ready;
			if (this.unloading) return;
			registerInbox({ plugin: this, app, inbox, hostActionBindings });
			settings.setInbox(inbox);
		} catch (error) {
			this.disposeInbox?.();
			this.disposeInbox = null;
			if (!this.unloading)
				new Notice(`Study inbox unavailable: ${errorMessage(error)}`);
		}
	}

	private async loadQuickEdit(
		app: FranklinApp,
		settings: FranklinSettingTab,
		diff: ObsidianDiffClient,
	): Promise<void> {
		const registry = await this.loadDirectives();
		const { signal } = this.quickEditLifetime;
		if (!registry || signal.aborted) return;

		const ready = registerQuickEdit({
			plugin: this,
			franklin: app,
			registry,
			diff,
			signal,
		}).catch((error: unknown) => {
			if (!signal.aborted)
				new Notice(`Quick edit unavailable: ${errorMessage(error)}`);
			return undefined;
		});
		this.disposeQuickEdit = async () => {
			try {
				await (await ready)?.dispose();
			} catch (error) {
				new Notice(`Quick edit shutdown: ${errorMessage(error)}`);
			}
		};
		const quickEdit = await ready;
		if (quickEdit && !this.unloading)
			settings.setQuickEdit(quickEdit.preferences);
	}

	private async loadDirectives(): Promise<DirectiveRegistry | undefined> {
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
			return registry;
		} catch (error) {
			if (!this.unloading)
				new Notice(`Franklin directives failed to load: ${String(error)}`);
		}
	}

	onunload() {
		this.unloading = true;
		this.quickEditLifetime.abort();
		void this.directives?.dispose(this.disposeQuickEdit?.());
		this.disposeQuickEdit = undefined;
		this.directives = undefined;
		this.diffExplorerController?.onunload();
		this.diffController?.onunload();
		this.disposeInbox?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.hostActionBindings = [];
		this.disposeInbox = null;
	}
}
