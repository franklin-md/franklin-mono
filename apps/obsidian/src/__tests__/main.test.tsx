// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FranklinPlugin from '../main.js';
import { PortalProvider } from '../renderer/portal.js';

type UnloadController = {
	onunload: ReturnType<typeof vi.fn>;
};

type TestFranklinPlugin = {
	diffController: UnloadController;
	diffExplorerController: UnloadController;
	disposeFranklinApp: ReturnType<typeof vi.fn> | null;
	franklinApp: unknown;
};

describe('FranklinPlugin unload', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('clears the shared portal root and runs sub-controller unloads', () => {
		vi.stubGlobal('activeDocument', document);

		const hostEl = document.createElement('section');
		hostEl.onWindowMigrated = vi.fn(() => vi.fn());
		document.body.append(hostEl);
		const { unmount } = render(
			<PortalProvider hostEl={hostEl}>
				<div />
			</PortalProvider>,
		);
		const portalRoot = document.body.querySelector(
			'[data-franklin-portal-root="true"]',
		);
		expect(portalRoot?.isConnected).toBe(true);

		const plugin = Object.create(null) as TestFranklinPlugin;
		const disposeFranklinApp = vi.fn();
		plugin.diffController = { onunload: vi.fn() };
		plugin.diffExplorerController = { onunload: vi.fn() };
		plugin.disposeFranklinApp = disposeFranklinApp;
		plugin.franklinApp = {} as never;
		const pluginPrototype = FranklinPlugin.prototype as {
			onunload(this: TestFranklinPlugin): void;
		};

		pluginPrototype.onunload.call(plugin);

		expect(plugin.diffExplorerController.onunload).toHaveBeenCalledOnce();
		expect(plugin.diffController.onunload).toHaveBeenCalledOnce();
		expect(disposeFranklinApp).toHaveBeenCalledOnce();
		expect(plugin.disposeFranklinApp).toBeNull();
		expect(plugin.franklinApp).toBeNull();
		expect(portalRoot?.isConnected).toBe(false);

		unmount();
	});
});
