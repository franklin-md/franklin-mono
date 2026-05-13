import { Keymap } from 'obsidian';

export interface ClickModifiers {
	mod: boolean;
	alt: boolean;
	shift: boolean;
}

export function getClickModifiers(event: MouseEvent): ClickModifiers {
	return {
		mod: Keymap.isModifier(event, 'Mod'),
		alt: Keymap.isModifier(event, 'Alt'),
		shift: Keymap.isModifier(event, 'Shift'),
	};
}
