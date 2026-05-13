import type { PaneType } from 'obsidian';

import type { ClickModifiers } from '../../../utils/obsidian/keymap.js';

export type WikilinkPaneTarget = PaneType | false;

export function getWikilinkPaneTarget(
	modifiers: ClickModifiers,
): WikilinkPaneTarget {
	if (!modifiers.mod) return false;
	if (modifiers.alt && modifiers.shift) return 'window';
	if (modifiers.alt) return 'split';
	return 'tab';
}
