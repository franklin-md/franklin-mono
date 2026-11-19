import type { presetColors } from './colors.js';

export type PresetColor = keyof typeof presetColors;

// A saved prompt with an icon and color: Quick Edit presets and Inbox actions.
export type PromptPreset = {
	id: string;
	name: string;
	prompt: string;
	// An Obsidian icon ID, such as `lucide-link` or a plugin-registered icon.
	icon: string;
	color: PresetColor;
};
