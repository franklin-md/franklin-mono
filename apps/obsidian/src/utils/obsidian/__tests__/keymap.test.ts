import { describe, expect, it } from 'vitest';

import { getClickModifiers } from '../keymap.js';

describe('getClickModifiers', () => {
	it('extracts click modifiers from the Obsidian keymap', () => {
		const event = createMouseEvent({
			ctrlKey: true,
			altKey: true,
			shiftKey: true,
		});

		expect(getClickModifiers(event)).toEqual({
			mod: true,
			alt: true,
			shift: true,
		});
	});

	it('treats command/meta as the Obsidian mod key', () => {
		const event = createMouseEvent({
			metaKey: true,
		});

		expect(getClickModifiers(event).mod).toBe(true);
	});
});

function createMouseEvent(
	init: Partial<
		Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>
	>,
): MouseEvent {
	return {
		ctrlKey: init.ctrlKey ?? false,
		metaKey: init.metaKey ?? false,
		altKey: init.altKey ?? false,
		shiftKey: init.shiftKey ?? false,
	} as MouseEvent;
}
