import { z } from 'zod';

// Shared by the current and frozen storage schemas.
export function presetListSchema<Preset extends z.ZodType<{ id: string }>>(
	preset: Preset,
) {
	return z
		.array(preset)
		.refine(
			(presets) =>
				new Set(presets.map((item) => item.id)).size === presets.length,
			'Preset IDs must be unique',
		);
}
