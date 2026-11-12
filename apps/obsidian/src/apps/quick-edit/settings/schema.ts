import { z } from 'zod';
import { presetIcons } from '../presets/icons.js';
import { presetColors } from '../presets/colors.js';
import { createDefaultPresets } from '../presets/defaults.js';

export const quickEditSettingsSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: z.enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh']),
	instructions: z.string(),
	presets: z
		.array(
			z.object({
				id: z.string().min(1),
				name: z.string().trim().min(1),
				prompt: z.string().trim().min(1),
				icon: z.enum(Object.keys(presetIcons) as (keyof typeof presetIcons)[]),
				color: z.enum(
					Object.keys(presetColors) as (keyof typeof presetColors)[],
				),
			}),
		)
		.refine(
			(presets) =>
				new Set(presets.map((preset) => preset.id)).size === presets.length,
			'Preset IDs must be unique',
		)
		.default(createDefaultPresets),
});
