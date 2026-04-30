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
});
