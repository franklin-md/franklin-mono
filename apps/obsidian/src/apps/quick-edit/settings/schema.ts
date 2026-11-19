import { StoredThinkingLevel } from '@franklin/agent';
import { z } from 'zod';
import { createDefaultPresets } from '../presets/defaults.js';
import { presetListSchema } from '../presets/list-schema.js';
import { quickEditPresetSchema } from '../presets/schema.js';

export const quickEditSettingsSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: StoredThinkingLevel,
	instructions: z.string(),
	presets: presetListSchema(quickEditPresetSchema).default(
		createDefaultPresets,
	),
});
