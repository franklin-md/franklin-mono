import { describe, expect, it } from 'vitest';

import { Keymap } from '../index.js';

describe('Obsidian Keymap mock', () => {
	it.each([
		['plain click', {}, false],
		['middle click', { button: 1 }, 'tab'],
		['mod-click', { ctrlKey: true }, 'tab'],
		['mod-alt-click', { ctrlKey: true, altKey: true }, 'split'],
		[
			'mod-alt-shift-click',
			{ ctrlKey: true, altKey: true, shiftKey: true },
			'window',
		],
		['alt-shift without mod', { altKey: true, shiftKey: true }, false],
	])('maps %s to %s', (_name, init, expected) => {
		expect(Keymap.isModEvent(mouseEvent(init))).toBe(expected);
	});

	it('treats command/meta as the Obsidian mod key', () => {
		expect(Keymap.isModifier(mouseEvent({ metaKey: true }), 'Mod')).toBe(true);
	});
});

function mouseEvent(
	init: Partial<
		Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>
	> = {},
): MouseEvent {
	return {
		button: init.button ?? 0,
		ctrlKey: init.ctrlKey ?? false,
		metaKey: init.metaKey ?? false,
		altKey: init.altKey ?? false,
		shiftKey: init.shiftKey ?? false,
	} as MouseEvent;
}
