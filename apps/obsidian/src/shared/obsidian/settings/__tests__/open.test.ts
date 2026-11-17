import type { App } from 'obsidian';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const noticeMock = vi.hoisted(() => vi.fn());

vi.mock('obsidian', () => ({
	Notice: function Notice(message: string) {
		noticeMock(message);
	},
}));

import { openPluginSettings } from '../open.js';

beforeEach(() => {
	noticeMock.mockClear();
});

describe('openPluginSettings', () => {
	it('opens the Obsidian settings tab for the plugin', () => {
		const open = vi.fn();
		const openTabById = vi.fn();

		openPluginSettings(
			{
				setting: {
					open,
					openTabById,
				},
			} as unknown as App,
			'franklin',
		);

		expect(open).toHaveBeenCalledOnce();
		expect(openTabById).toHaveBeenCalledWith('franklin');
		expect(noticeMock).not.toHaveBeenCalled();
	});

	it('shows a fallback notice when the settings API is unavailable', () => {
		openPluginSettings({} as unknown as App, 'franklin');

		expect(noticeMock).toHaveBeenCalledWith(
			'Open Franklin settings from Obsidian settings.',
		);
	});

	it('selects Connections after opening the plugin tab', () => {
		const selectSection = vi.fn();
		const setting = {
			open: vi.fn(),
			openTabById: vi.fn(() => {
				setting.activeTab = { selectSection };
			}),
			activeTab: undefined as unknown,
		};

		openPluginSettings(
			{ setting } as unknown as App,
			'franklin',
			'connections',
		);

		expect(setting.openTabById).toHaveBeenCalledWith('franklin');
		expect(selectSection).toHaveBeenCalledWith('connections');
	});

	it('preserves the selected section when no destination is requested', () => {
		const selectSection = vi.fn();
		const setting = {
			open: vi.fn(),
			openTabById: vi.fn(),
			activeTab: { selectSection },
		};

		openPluginSettings({ setting } as unknown as App, 'franklin');

		expect(setting.open).toHaveBeenCalledOnce();
		expect(selectSection).not.toHaveBeenCalled();
	});
});
