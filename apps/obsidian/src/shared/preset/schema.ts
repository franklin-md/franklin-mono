import { z } from 'zod';
import { presetColors } from './colors.js';
import type { PresetColor } from './types.js';

// Quick Edit and Inbox storage both decode saved presets with this schema.
// Changing it changes both formats: add a storage version to each codec.
export const promptPresetSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1),
	prompt: z.string().trim().min(1),
	// Keep IDs Obsidian no longer registers, such as a removed plugin's icon:
	// ObsidianIcon draws a fallback, and reinstalling the plugin restores them.
	icon: z.string().min(1),
	color: z.enum(Object.keys(presetColors) as PresetColor[]),
});
