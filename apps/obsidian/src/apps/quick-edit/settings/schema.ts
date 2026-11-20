import { StoredThinkingLevel } from '@franklin/agent';
import { z } from 'zod';
import { createDefaultPresets } from '../presets/defaults.js';
import { presetListSchema } from '../../../shared/preset/list-schema.js';
import { promptPresetSchema } from '../../../shared/preset/schema.js';

export const quickEditSettingsSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: StoredThinkingLevel,
	instructions: z.string(),
	presets: presetListSchema(promptPresetSchema).default(createDefaultPresets),
});
