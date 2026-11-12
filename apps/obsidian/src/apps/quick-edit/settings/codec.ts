import { versioned, zodCodec } from '@franklin/lib';
import { createDefaultPresets } from '../presets/defaults.js';
import { quickEditSettingsSchema } from './schema.js';

export const quickEditSettingsCodec = versioned()
	.version(1, zodCodec(quickEditSettingsSchema.omit({ presets: true })))
	.version(2, zodCodec(quickEditSettingsSchema), (previous) => ({
		...previous,
		presets: createDefaultPresets(),
	}))
	.build();
