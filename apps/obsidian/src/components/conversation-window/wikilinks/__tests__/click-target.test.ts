import { describe, expect, it } from 'vitest';

import { getWikilinkPaneTarget } from '../click-target.js';

describe('getWikilinkPaneTarget', () => {
	it('uses the current tab for a plain primary click', () => {
		expect(
			getWikilinkPaneTarget({
				mod: false,
				alt: false,
				shift: false,
				button: 'primary',
			}),
		).toBe(false);
	});

	it('opens a mod-click in a new tab', () => {
		expect(
			getWikilinkPaneTarget({
				mod: true,
				alt: false,
				shift: false,
				button: 'primary',
			}),
		).toBe('tab');
	});

	it('opens a middle-click in a new tab', () => {
		expect(
			getWikilinkPaneTarget({
				mod: false,
				alt: false,
				shift: false,
				button: 'middle',
			}),
		).toBe('tab');
	});

	it('opens a mod-alt click in a new split', () => {
		expect(
			getWikilinkPaneTarget({
				mod: true,
				alt: true,
				shift: false,
				button: 'primary',
			}),
		).toBe('split');
	});

	it('opens a mod-alt-shift click in a new window', () => {
		expect(
			getWikilinkPaneTarget({
				mod: true,
				alt: true,
				shift: true,
				button: 'primary',
			}),
		).toBe('window');
	});

	it('ignores alt and shift without the mod key', () => {
		expect(
			getWikilinkPaneTarget({
				mod: false,
				alt: true,
				shift: true,
				button: 'primary',
			}),
		).toBe(false);
	});
});
