import type { presetIcons } from './icons.js';
import type { presetColors } from './colors.js';

export type QuickEditPreset = {
	id: string;
	name: string;
	prompt: string;
	icon: keyof typeof presetIcons;
	color: keyof typeof presetColors;
};
