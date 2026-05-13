import { Keymap } from 'obsidian';

export type ClickButton = 'primary' | 'middle' | 'other';

export interface ClickModifiers {
	mod: boolean;
	alt: boolean;
	shift: boolean;
	button: ClickButton;
}

export function getClickModifiers(event: MouseEvent): ClickModifiers {
	return {
		mod: Keymap.isModifier(event, 'Mod'),
		alt: Keymap.isModifier(event, 'Alt'),
		shift: Keymap.isModifier(event, 'Shift'),
		button: getClickButton(event),
	};
}

function getClickButton(event: MouseEvent): ClickButton {
	if (event.button === 0) return 'primary';
	if (event.button === 1) return 'middle';
	return 'other';
}
