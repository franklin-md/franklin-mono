import { Keymap } from 'obsidian';

export interface ClickModifiers {
	mod: boolean;
	alt: boolean;
	shift: boolean;
}

export function getClickModifiers(event: MouseEvent): ClickModifiers {
	// Obsidian's Mod modifier is Cmd on macOS and Ctrl elsewhere.
	// https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts#L4406-L4411
	return {
		mod: Keymap.isModifier(event, 'Mod'),
		alt: Keymap.isModifier(event, 'Alt'),
		shift: Keymap.isModifier(event, 'Shift'),
	};
}
