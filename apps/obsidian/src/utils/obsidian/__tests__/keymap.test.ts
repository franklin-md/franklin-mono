import { describe, expect, it } from 'vitest';

import { getClickModifiers } from '../keymap.js';

describe('getClickModifiers', () => {
	it('extracts primary click modifiers from the Obsidian keymap', () => {
		const event = createMouseEvent({
			button: 0,
			ctrlKey: true,
			altKey: true,
		});

		expect(getClickModifiers(event)).toEqual({
			mod: true,
			alt: true,
			shift: false,
			button: 'primary',
		});
	});

	it('treats command/meta as the Obsidian mod key', () => {
		const event = createMouseEvent({
			button: 0,
			metaKey: true,
		});

		expect(getClickModifiers(event).mod).toBe(true);
	});

	it('extracts middle clicks separately from primary clicks', () => {
		const event = createMouseEvent({ button: 1 });

		expect(getClickModifiers(event)).toEqual({
			mod: false,
			alt: false,
			shift: false,
			button: 'middle',
		});
	});
});

function createMouseEvent(
	init: Partial<
		Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>
	>,
): MouseEvent {
	return {
		button: init.button ?? 0,
		ctrlKey: init.ctrlKey ?? false,
		metaKey: init.metaKey ?? false,
		altKey: init.altKey ?? false,
		shiftKey: init.shiftKey ?? false,
	} as MouseEvent;
}
