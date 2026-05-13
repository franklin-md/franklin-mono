import type { PaneType } from 'obsidian';

import type { ClickModifiers } from '../../../utils/obsidian/keymap.js';

export type WikilinkPaneTarget = PaneType | false;

// Mirrors Obsidian's documented link modifier behavior for primary clicks.
// https://obsidian.md/help/tabs
// Keymap.isModEvent documents the same PaneType mapping, including middle-click;
// this helper intentionally keeps only the click path handled by this component.
// https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts#L3519-L3527
export function getWikilinkPaneTarget(
	modifiers: ClickModifiers,
): WikilinkPaneTarget {
	if (!modifiers.mod) return false;
	if (modifiers.alt && modifiers.shift) return 'window';
	if (modifiers.alt) return 'split';
	return 'tab';
}
