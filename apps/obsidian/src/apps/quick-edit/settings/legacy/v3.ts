import { StoredThinkingLevel } from '@franklin/agent';
import { z } from 'zod';
import { createDefaultPresets } from '../../presets/defaults.js';
import { presetListSchema } from '../../presets/list-schema.js';
import type { QuickEditPreset } from '../../presets/types.js';
import { legacyIconIds } from './icons.js';
import type { LegacyIcon } from './icons.js';

// Storage versions 1-3, spelled out rather than extended from the current
// schemas so later changes to those cannot change how older files decode. Keep
// these fixed. Presets saved icon slugs and five palette keys.
const legacyPresetSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1),
	prompt: z.string().trim().min(1),
	icon: z.enum(Object.keys(legacyIconIds) as LegacyIcon[]),
	color: z.enum(['blue', 'amber', 'green', 'purple', 'red']),
});

// Migrations seed current defaults, so data before version 4 can mix both shapes.
export type LegacyPreset = z.infer<typeof legacyPresetSchema> | QuickEditPreset;

export const legacySettingsSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	// These versions saved any level, including the retired `minimal`.
	reasoning: StoredThinkingLevel,
	instructions: z.string(),
	presets: presetListSchema(legacyPresetSchema)
		.optional()
		.transform((presets): LegacyPreset[] => presets ?? createDefaultPresets()),
});
