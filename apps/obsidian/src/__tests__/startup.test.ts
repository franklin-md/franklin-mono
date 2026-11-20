// @vitest-environment jsdom

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FranklinApp } from '@franklin/agent';
import * as obsidian from 'obsidian';
import type { InboxController } from '../apps/inbox/controller/index.js';
import type { App, PluginManifest } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startup = vi.hoisted(() => ({
	create: vi.fn(),
	scan: vi.fn(async () => {}),
	unload: vi.fn(),
	quickEdit: vi.fn(),
}));

vi.mock('../plugin/bootstrap.js', () => ({
	bootstrapPlugin: startup.create,
}));
vi.mock('../apps/quick-edit/register.js', () => ({
	registerQuickEdit: startup.quickEdit,
}));
vi.mock('../dev/react-scan.js', () => ({ registerReactScan: startup.scan }));
vi.mock('../shared/diff/client.js', () => ({
	ObsidianDiffClient: vi.fn(),
}));
vi.mock('../shared/diff/controller.js', () => ({
	DiffController: class {
		onload() {}
		onunload = startup.unload;
	},
}));
vi.mock('../shared/diff/explorer.js', () => ({
	DiffExplorerController: class {
		onload() {}
		onunload = startup.unload;
	},
}));

import { editorAnchors } from '../shared/obsidian/editor/anchors.js';
import FranklinPlugin from '../main.js';
import * as paths from '../shared/obsidian/path.js';
import { DirectiveRegistry } from '../shared/directives/registry.js';
import { createDirectiveTestRegistry } from '../shared/directives/testing/registry.js';

let pluginDir: string;

function createPlugin() {
	const plugin = new FranklinPlugin({} as App, {} as PluginManifest);
	const registerView = vi.spyOn(plugin, 'registerView');
	const addSettingTab = vi.spyOn(plugin, 'addSettingTab');
	const addCommand = vi.spyOn(plugin, 'addCommand');
	const addRibbonIcon = vi.spyOn(plugin, 'addRibbonIcon');
	const registerEditorExtension = vi.spyOn(plugin, 'registerEditorExtension');
	const registerMarkdownPostProcessor = vi.spyOn(
		plugin,
		'registerMarkdownPostProcessor',
	);
	return {
		plugin,
		registerView,
		addSettingTab,
		addCommand,
		addRibbonIcon,
		registerEditorExtension,
		registerMarkdownPostProcessor,
	};
}

function createRuntime() {
	const inboxStartup = Promise.withResolvers<InboxController>();
	const disposeInbox = vi.fn(async () => {});
	return {
		app: {} as FranklinApp,
		getCreateInput: vi.fn(),
		hostActionBindings: [],
		startInbox: vi.fn(() => ({
			ready: inboxStartup.promise,
			dispose: disposeInbox,
		})),
		inboxStartup,
		disposeInbox,
	};
}

beforeEach(async () => {
	pluginDir = await mkdtemp(join(tmpdir(), 'franklin-startup-'));
	vi.spyOn(paths, 'getPluginAbsolutePath').mockReturnValue(pluginDir);
	vi.stubGlobal('activeDocument', document);
	startup.create.mockReset();
	startup.scan.mockReset().mockResolvedValue(undefined);
	startup.unload.mockClear();
	startup.quickEdit.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
	await rm(pluginDir, { recursive: true, force: true });
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('FranklinPlugin startup', () => {
	it('does not register host resources when startup finishes after unload', async () => {
		const runtime = createRuntime();
		const bootstrap = Promise.withResolvers<typeof runtime>();
		startup.create.mockReturnValue(bootstrap.promise);
		const {
			plugin,
			registerView,
			addSettingTab,
			addCommand,
			addRibbonIcon,
			registerEditorExtension,
			registerMarkdownPostProcessor,
		} = createPlugin();
		const loading = plugin.onload();
		await vi.waitFor(() => expect(startup.create).toHaveBeenCalledOnce());

		plugin.onunload();
		bootstrap.resolve(runtime);
		await bootstrap.promise;
		await loading;

		expect(runtime.startInbox).not.toHaveBeenCalled();
		expect(registerView).not.toHaveBeenCalled();
		expect(addSettingTab).not.toHaveBeenCalled();
		expect(addCommand).not.toHaveBeenCalled();
		expect(addRibbonIcon).not.toHaveBeenCalled();
		expect(registerEditorExtension).not.toHaveBeenCalled();
		expect(registerMarkdownPostProcessor).not.toHaveBeenCalled();
		expect(plugin.franklinApp).toBeNull();
	});

	it('can unload before React Scan finishes without constructing a runtime', async () => {
		let finishScan!: () => void;
		startup.scan.mockReturnValue(
			new Promise<void>((resolve) => {
				finishScan = resolve;
			}),
		);
		const { plugin, registerView } = createPlugin();
		const loading = plugin.onload();

		expect(() => plugin.onunload()).not.toThrow();
		finishScan();
		await loading;

		expect(startup.create).not.toHaveBeenCalled();
		expect(registerView).not.toHaveBeenCalled();
	});

	it('keeps Chat, settings and editor anchors available when directive storage is unreadable', async () => {
		const path = join(pluginDir, 'directives.json');
		await writeFile(path, '{broken');
		startup.create.mockResolvedValue(createRuntime());
		const {
			plugin,
			registerView,
			addSettingTab,
			registerEditorExtension,
			registerMarkdownPostProcessor,
		} = createPlugin();
		const notice = vi.spyOn(obsidian, 'Notice');
		await plugin.onload();
		await vi.waitFor(() =>
			expect(notice).toHaveBeenCalledWith(
				expect.stringContaining('directives failed to load'),
			),
		);
		expect(registerView).toHaveBeenCalledOnce();
		expect(addSettingTab).toHaveBeenCalledOnce();
		expect(registerEditorExtension).toHaveBeenCalledWith(editorAnchors);
		expect(registerMarkdownPostProcessor).not.toHaveBeenCalled();
		expect(await readFile(path, 'utf8')).toBe('{broken');
		expect(startup.quickEdit).not.toHaveBeenCalled();
		plugin.onunload();
	});

	it('disposes a registry that finishes restoring after unload', async () => {
		const registry = await createDirectiveTestRegistry();
		const dispose = vi.spyOn(registry, 'dispose');
		let finish!: (registry: DirectiveRegistry) => void;
		const restore = vi.spyOn(DirectiveRegistry, 'create').mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		startup.create.mockResolvedValue(createRuntime());
		const { plugin, registerMarkdownPostProcessor } = createPlugin();
		await plugin.onload();
		await vi.waitFor(() => expect(restore).toHaveBeenCalledOnce());
		plugin.onunload();
		finish(registry);
		await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
		expect(registerMarkdownPostProcessor).not.toHaveBeenCalled();
	});

	it('registers Chat, settings and directive adapters while Inbox recovery is pending', async () => {
		const runtime = createRuntime();
		const dispose = vi.spyOn(DirectiveRegistry.prototype, 'dispose');
		startup.create.mockResolvedValue(runtime);
		const {
			plugin,
			registerView,
			addSettingTab,
			addCommand,
			registerEditorExtension,
			registerMarkdownPostProcessor,
		} = createPlugin();

		await plugin.onload();
		await vi.waitFor(() =>
			expect(registerMarkdownPostProcessor).toHaveBeenCalledOnce(),
		);
		expect(runtime.startInbox).toHaveBeenCalledOnce();

		expect(registerView).toHaveBeenCalledOnce();
		expect(addSettingTab).toHaveBeenCalledOnce();
		// Anchors, Live Preview directives and directive removal.
		expect(registerEditorExtension).toHaveBeenCalledTimes(3);
		expect(registerEditorExtension).toHaveBeenCalledWith(editorAnchors);
		expect(registerMarkdownPostProcessor).toHaveBeenCalledOnce();
		expect(addCommand).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'open-chat-window' }),
		);
		expect(plugin.franklinApp).toBe(runtime.app);

		runtime.inboxStartup.resolve({
			subscribeSaved: () => () => {},
		} as unknown as InboxController);
		await vi.waitFor(() => expect(registerView).toHaveBeenCalledTimes(2));
		expect(registerView.mock.calls.map(([type]) => type)).toContain(
			'franklin-study-inbox',
		);
		expect(addCommand.mock.calls.map(([command]) => command.id)).toEqual([
			'open-chat-window',
			'open-study-inbox',
			'selection-to-study-inbox',
			'open-inbox-capture-chooser',
		]);
		plugin.onunload();
		expect(runtime.disposeInbox).toHaveBeenCalledOnce();
		expect(dispose).toHaveBeenCalledOnce();
		expect(startup.unload).toHaveBeenCalledTimes(2);
	});

	it('waits for Quick Edit startup to settle before disposing its registry', async () => {
		const dispose = vi.fn(async () => {});
		const startupReady = Promise.withResolvers<{ dispose: typeof dispose }>();
		const registry = await createDirectiveTestRegistry();
		vi.spyOn(DirectiveRegistry, 'create').mockResolvedValue(registry);
		const registryDispose = vi.spyOn(registry, 'dispose');
		startup.quickEdit.mockReturnValue(startupReady.promise);
		startup.create.mockResolvedValue(createRuntime());
		const { plugin } = createPlugin();
		await plugin.onload();
		await vi.waitFor(() => expect(startup.quickEdit).toHaveBeenCalledOnce());

		plugin.onunload();
		startupReady.resolve({ dispose });
		await registryDispose.mock.results[0]?.value;
		expect(dispose).toHaveBeenCalledOnce();
	});

	it('cancels Inbox recovery on unload and skips late registration', async () => {
		const runtime = createRuntime();
		startup.create.mockResolvedValue(runtime);
		const { plugin, registerView, addCommand } = createPlugin();
		await plugin.onload();
		await vi.waitFor(() => expect(runtime.startInbox).toHaveBeenCalledOnce());
		plugin.onunload();
		expect(runtime.disposeInbox).toHaveBeenCalledOnce();
		runtime.inboxStartup.resolve({} as InboxController);
		await runtime.inboxStartup.promise;
		expect(registerView).toHaveBeenCalledOnce();
		expect(addCommand.mock.calls.map(([command]) => command.id)).toEqual([
			'open-chat-window',
		]);
	});

	it('keeps Chat and settings available when Inbox recovery fails', async () => {
		const runtime = createRuntime();
		startup.create.mockResolvedValue(runtime);
		const { plugin, registerView, addSettingTab } = createPlugin();
		await plugin.onload();
		await vi.waitFor(() => expect(runtime.startInbox).toHaveBeenCalledOnce());
		runtime.inboxStartup.reject(new Error('Inbox data could not be restored'));
		await vi.waitFor(() => expect(runtime.disposeInbox).toHaveBeenCalledOnce());

		expect(registerView).toHaveBeenCalledOnce();
		expect(addSettingTab).toHaveBeenCalledOnce();
		expect(plugin.franklinApp).toBe(runtime.app);
		plugin.onunload();
	});
});
