import { describe, expect, it } from 'vitest';

import type { ClickModifiers } from '../../../../utils/obsidian/keymap.js';
import {
	getWikilinkPaneTarget,
	type WikilinkPaneTarget,
} from '../click-target.js';

describe('getWikilinkPaneTarget', () => {
	it.each([
		['plain click', {}, false],
		['mod-click', { mod: true }, 'tab'],
		['mod-alt-click', { mod: true, alt: true }, 'split'],
		['mod-alt-shift-click', { mod: true, alt: true, shift: true }, 'window'],
		['alt-shift without mod', { alt: true, shift: true }, false],
	] satisfies Array<
		[
			name: string,
			overrides: Partial<ClickModifiers>,
			expected: WikilinkPaneTarget,
		]
	>)('maps %s to %s', (_name, overrides, expected) => {
		expect(getWikilinkPaneTarget(clickModifiers(overrides))).toBe(expected);
	});
});

function clickModifiers(
	overrides: Partial<ClickModifiers> = {},
): ClickModifiers {
	return {
		mod: false,
		alt: false,
		shift: false,
		...overrides,
	};
}
