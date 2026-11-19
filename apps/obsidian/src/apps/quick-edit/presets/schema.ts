import { z } from 'zod';
import { presetColors } from './colors.js';

export const quickEditPresetSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1),
	prompt: z.string().trim().min(1),
	// Keep IDs Obsidian no longer registers, such as a removed plugin's icon:
	// ObsidianIcon draws a fallback, and reinstalling the plugin restores them.
	icon: z.string().min(1),
	color: z.enum(Object.keys(presetColors) as (keyof typeof presetColors)[]),
});
