import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { openInboxHotkeys } from '../open-inbox-hotkeys.js';

describe('openInboxHotkeys', () => {
	it('opens the native editor and searches for the inbox capture command', () => {
		const open = vi.fn();
		const setQuery = vi.fn();
		const activeTab = { setQuery };
		const setting = {
			open,
			openTabById: vi.fn(() => {
				setting.activeTab = activeTab;
			}),
			activeTab: undefined as unknown,
		};
		openInboxHotkeys({ setting } as unknown as App);
		expect(open).toHaveBeenCalledOnce();
		expect(setting.openTabById).toHaveBeenCalledWith('hotkeys');
		expect(setQuery).toHaveBeenCalledWith('Add selection to study inbox');
	});
	it('still opens hotkeys when the host does not expose a search API', () => {
		const openTabById = vi.fn();
		expect(() =>
			openInboxHotkeys({
				setting: { open: vi.fn(), openTabById, activeTab: {} },
			} as unknown as App),
		).not.toThrow();
		expect(openTabById).toHaveBeenCalledWith('hotkeys');
	});
	it('does not throw if settings are unavailable', () => {
		expect(() => openInboxHotkeys({} as App)).not.toThrow();
	});
});
