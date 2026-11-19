import type { presetColors } from './colors.js';

export type QuickEditPreset = {
	id: string;
	name: string;
	prompt: string;
	// An Obsidian icon ID, such as `lucide-link` or a plugin-registered icon.
	icon: string;
	color: keyof typeof presetColors;
};
