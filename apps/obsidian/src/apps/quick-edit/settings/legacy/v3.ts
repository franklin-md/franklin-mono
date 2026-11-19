import { z } from 'zod';
import { createDefaultPresets } from '../../presets/defaults.js';
import { presetListSchema } from '../../presets/list-schema.js';
import { quickEditPresetSchema } from '../../presets/schema.js';
import type { QuickEditPreset } from '../../presets/types.js';
import { quickEditSettingsSchema } from '../schema.js';
import { legacyIconIds } from './icons.js';
import type { LegacyIcon } from './icons.js';

// Saved presets in storage versions 1-3: icon slugs and five palette keys.
// Keep this fixed so older files keep decoding after the current schema changes.
const legacyPresetSchema = quickEditPresetSchema.extend({
	icon: z.enum(Object.keys(legacyIconIds) as LegacyIcon[]),
	color: z.enum(['blue', 'amber', 'green', 'purple', 'red']),
});

// Migrations seed current defaults, so data before version 4 can mix both shapes.
export type LegacyPreset = z.infer<typeof legacyPresetSchema> | QuickEditPreset;

export const legacySettingsSchema = quickEditSettingsSchema.extend({
	presets: presetListSchema(legacyPresetSchema)
		.optional()
		.transform((presets): LegacyPreset[] => presets ?? createDefaultPresets()),
});
