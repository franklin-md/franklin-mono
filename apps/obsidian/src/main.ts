import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import { Notice, Plugin } from 'obsidian';

import { registerChat } from './apps/chat/register.js';
import { registerInbox } from './apps/inbox/register.js';
import type { InboxController } from './apps/inbox/controller/controller.js';
import { registerQuickEdit } from './apps/quick-edit/register.js';
import type { QuickEditPreferences } from './apps/quick-edit/settings/store.js';
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

type PluginRuntime = Awaited<ReturnType<typeof bootstrapPlugin>>;

export default class FranklinPlugin extends Plugin {
	private diffController: DiffController | null = null;
	private diffExplorerController: DiffExplorerController | null = null;
	private unloading = false;
	private directives?: DirectiveRegistry;
	private disposeDirectiveApps?: () => Promise<void>;
	private disposeFranklinApp: (() => void) | null = null;
	franklinApp: FranklinApp | null = null;
	inbox: InboxController | null = null;
	quickEditPreferences: QuickEditPreferences | null = null;
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
			.then(async (runtime) => {
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
				const registry = await this.loadDirectives();
				if (!registry || this.isUnloading()) return;
				const inbox = runtime.startInbox();
				const apps = this.startDirectiveApps(
					runtime,
					inbox.ready,
					registry,
					diffClient,
				);
				this.disposeDirectiveApps = () =>
					inbox.dispose(
						apps.then(
							async (stop) => stop?.(),
							() => undefined,
						),
					);
				await apps;
			})
			.catch((err: unknown) => {
				if (this.unloading) return;
				console.error(err);
				new Notice(
					`Franklin failed to load: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
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

	private async startDirectiveApps(
		{ app, hostActionBindings }: PluginRuntime,
		ready: Promise<InboxController>,
		directives: DirectiveRegistry,
		diff: ObsidianDiffClient,
	): Promise<(() => Promise<void>) | undefined> {
		const inbox = await ready.catch((error: unknown) => {
			if (!this.unloading)
				new Notice(`Study inbox unavailable: ${String(error)}`);
			return undefined;
		});
		if (this.unloading) return;
		const disposeInbox =
			inbox &&
			registerInbox({
				plugin: this,
				app,
				inbox,
				directives,
				hostActionBindings,
			});
		this.inbox = inbox ?? null;
		const quickEdit = await registerQuickEdit({
			plugin: this,
			franklin: app,
			registry: directives,
			diff,
		}).catch((error: unknown) => {
			if (!this.unloading)
				new Notice(`Quick edit unavailable: ${String(error)}`);
			return undefined;
		});
		if (!this.isUnloading())
			this.quickEditPreferences = quickEdit?.preferences ?? null;
		return async () => {
			const results = await Promise.allSettled([
				quickEdit?.dispose(),
				disposeInbox?.(),
			]);
			const failure = results.find((result) => result.status === 'rejected');
			if (failure) throw new Error(String(failure.reason));
		};
	}

	private isUnloading(): boolean {
		return this.unloading;
	}

	onunload() {
		this.unloading = true;
		const stopApps = this.disposeDirectiveApps?.().catch((error: unknown) => {
			new Notice(`Franklin shutdown: ${String(error)}`);
		});
		void this.directives?.dispose(stopApps);
		this.directives = undefined;
		this.disposeDirectiveApps = undefined;
		this.diffExplorerController?.onunload();
		this.diffController?.onunload();
		this.disposeFranklinApp?.();
		clearPortalRoot(activeDocument);
		this.franklinApp = null;
		this.inbox = null;
		this.quickEditPreferences = null;
		this.hostActionBindings = [];
		this.disposeFranklinApp = null;
	}
}
