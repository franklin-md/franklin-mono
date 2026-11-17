// @vitest-environment jsdom

import type { FranklinApp } from '@franklin/agent';
import type { App, PluginManifest } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startup = vi.hoisted(() => ({
	create: vi.fn(),
	scan: vi.fn(async () => {}),
	unload: vi.fn(),
}));

vi.mock('../plugin/bootstrap.js', () => ({
	bootstrapPlugin: startup.create,
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
import type { DirectiveRegistry } from '../shared/directives/registry.js';

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
	return {
		app: {} as FranklinApp,
		directives: {} as DirectiveRegistry,
		getCreateInput: vi.fn(),
		hostActionBindings: [],
		dispose: vi.fn(),
	};
}

beforeEach(() => {
	vi.stubGlobal('activeDocument', document);
	startup.create.mockReset();
	startup.scan.mockReset().mockResolvedValue(undefined);
	startup.unload.mockClear();
});

afterEach(() => {
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

	it('registers Chat and directive adapters and invokes cleanup on unload', async () => {
		const runtime = createRuntime();
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
		await vi.waitFor(() => expect(registerView).toHaveBeenCalledOnce());

		expect(addSettingTab).toHaveBeenCalledOnce();
		expect(registerEditorExtension).toHaveBeenCalledTimes(2);
		expect(registerEditorExtension).toHaveBeenCalledWith(editorAnchors);
		expect(registerMarkdownPostProcessor).toHaveBeenCalledOnce();
		expect(addCommand).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'open-chat-window' }),
		);
		expect(plugin.franklinApp).toBe(runtime.app);
		plugin.onunload();
		expect(runtime.dispose).toHaveBeenCalledOnce();
		expect(startup.unload).toHaveBeenCalledTimes(2);
	});
});
