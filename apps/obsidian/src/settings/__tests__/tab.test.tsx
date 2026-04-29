// @vitest-environment jsdom

import type { FranklinApp } from '@franklin/agent/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Mounter } from '../../renderer/mount.js';

const sharedMounter = vi.hoisted(
	(): Mounter => ({
		mount: vi.fn(),
		unmount: vi.fn(),
	}),
);

vi.mock('../../renderer/mount.js', () => ({
	createMounter: vi.fn(() => sharedMounter),
}));

vi.mock('../page.js', () => ({
	SettingsPage: () => null,
}));

import { FranklinSettingTab } from '../tab.js';

const stubApp = (): FranklinApp =>
	({ __stub: 'franklin-app' }) as unknown as FranklinApp;

function createTab(app: FranklinApp | null = stubApp()): FranklinSettingTab {
	return new FranklinSettingTab({
		app: {},
		franklinApp: app,
	} as ConstructorParameters<typeof FranklinSettingTab>[0]);
}

beforeEach(() => {
	vi.mocked(sharedMounter.mount).mockClear();
	vi.mocked(sharedMounter.unmount).mockClear();
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('FranklinSettingTab', () => {
	it('remounts the React settings root each time display is called', () => {
		const tab = createTab();

		tab.display();
		tab.display();

		expect(sharedMounter.mount).toHaveBeenCalledTimes(2);
	});

	it('unmounts the React settings root on hide', () => {
		const tab = createTab();

		tab.display();
		tab.hide();

		expect(sharedMounter.unmount).toHaveBeenCalledOnce();
	});
});
