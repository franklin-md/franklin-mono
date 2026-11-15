// @vitest-environment jsdom

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FranklinApp } from '@franklin/agent';
import * as obsidian from 'obsidian';
import type { App, PluginManifest } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startup = vi.hoisted(() => ({
	create: vi.fn(),
	scan: vi.fn(async () => {}),
	unload: vi.fn(),
	unregisterInbox: vi.fn(async () => {}),
	registerQuickEdit: vi.fn(async () => undefined),
}));

vi.mock('../plugin/bootstrap.js', () => ({
	bootstrapPlugin: startup.create,
}));
vi.mock('../apps/inbox/register.js', () => ({
	registerInbox: () => startup.unregisterInbox,
}));
vi.mock('../apps/quick-edit/register.js', () => ({
	registerQuickEdit: startup.registerQuickEdit,
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
	const inbox = { dispose: vi.fn(async () => {}) };
	return {
		app: {} as FranklinApp,
		startInbox: vi.fn(() => ({
			ready: Promise.resolve(inbox),
			dispose: async (beforeClose: Promise<void>) => {
				await beforeClose;
				await inbox.dispose();
			},
		})),
		inbox,
		getCreateInput: vi.fn(),
		hostActionBindings: [],
		dispose: vi.fn(),
	};
}

beforeEach(async () => {
	pluginDir = await mkdtemp(join(tmpdir(), 'franklin-startup-'));
	vi.spyOn(paths, 'getPluginAbsolutePath').mockReturnValue(pluginDir);
	vi.stubGlobal('activeDocument', document);
	startup.create.mockReset();
	startup.scan.mockReset().mockResolvedValue(undefined);
	startup.unload.mockClear();
	startup.unregisterInbox.mockClear();
	startup.registerQuickEdit.mockClear();
});

afterEach(async () => {
	await rm(pluginDir, { recursive: true, force: true });
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('FranklinPlugin startup', () => {
	it('does not register host resources when startup finishes after unload', async () => {
		const runtime = createRuntime();
		let finishStartup!: (value: typeof runtime) => void;
		startup.create.mockReturnValue(
			new Promise((resolve) => {
				finishStartup = resolve;
			}),
		);
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
		finishStartup(runtime);
		await loading;
		await vi.waitFor(() => expect(runtime.dispose).toHaveBeenCalledOnce());

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
		const runtime = createRuntime();
		startup.create.mockResolvedValue(runtime);
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
		expect(runtime.startInbox).not.toHaveBeenCalled();
		expect(await readFile(path, 'utf8')).toBe('{broken');
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

	it('registers Chat and directive adapters and invokes cleanup on unload', async () => {
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
		expect(registerView).toHaveBeenCalledOnce();

		expect(addSettingTab).toHaveBeenCalledOnce();
		expect(registerEditorExtension).toHaveBeenCalledTimes(2);
		expect(registerEditorExtension).toHaveBeenCalledWith(editorAnchors);
		expect(registerMarkdownPostProcessor).toHaveBeenCalledOnce();
		expect(addCommand).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'open-chat-window' }),
		);
		expect(plugin.franklinApp).toBe(runtime.app);
		await vi.waitFor(() =>
			expect(startup.registerQuickEdit).toHaveBeenCalledOnce(),
		);
		plugin.onunload();
		expect(runtime.dispose).toHaveBeenCalledOnce();
		expect(dispose).toHaveBeenCalledOnce();
		await vi.waitFor(() =>
			expect(runtime.inbox.dispose).toHaveBeenCalledOnce(),
		);
		expect(startup.unregisterInbox).toHaveBeenCalledOnce();
		expect(startup.unload).toHaveBeenCalledTimes(2);
	});
});
