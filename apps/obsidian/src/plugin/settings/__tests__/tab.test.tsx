// @vitest-environment jsdom

import type { ComponentProps, ReactElement } from 'react';
import type { SettingsPage } from '../page.js';
import type { FranklinApp } from '@franklin/agent';
import type FranklinPlugin from '../../../main.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Mounter } from '../../../shared/ui/mount.js';

const sharedMounter = vi.hoisted(
	(): Mounter => ({
		mount: vi.fn(),
		unmount: vi.fn(),
	}),
);

vi.mock('../../../shared/ui/mount.js', () => ({
	createMounter: vi.fn(() => sharedMounter),
}));

vi.mock('../page.js', () => ({
	SettingsPage: () => null,
}));

import { FranklinSettingTab } from '../tab.js';

const stubApp = (): FranklinApp =>
	({ __stub: 'franklin-app' }) as unknown as FranklinApp;

function createTab(app: FranklinApp | null = stubApp()): FranklinSettingTab {
	const plugin = {
		app: {},
		franklinApp: app,
		hostActionBindings: [],
	} as unknown as FranklinPlugin;
	return new FranklinSettingTab(plugin);
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

	it('remembers user navigation on reopen and lets an explicit destination override it', () => {
		const tab = createTab();
		const page = () => {
			const root = vi.mocked(sharedMounter.mount).mock
				.lastCall?.[1] as ReactElement<{
				children: ReactElement<ComponentProps<typeof SettingsPage>>;
			}>;
			return root.props.children.props;
		};
		tab.display();
		expect(page().initialSection).toBe('general');
		page().onSectionChange?.('flashcards');
		tab.hide();
		tab.display();
		expect(page().initialSection).toBe('flashcards');
		tab.selectSection('connections');
		expect(page().initialSection).toBe('connections');
	});

	it('unmounts the React settings root on hide', () => {
		const tab = createTab();

		tab.display();
		tab.hide();

		expect(sharedMounter.unmount).toHaveBeenCalledOnce();
	});
});
