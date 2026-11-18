import { versioned, zodCodec } from '@franklin/lib';
import { createDefaultPresets } from '../presets/defaults.js';
import { migratePresets } from './migrate-presets.js';
import { quickEditSettingsSchema } from './schema.js';

export const quickEditSettingsCodec = versioned()
	.version(1, zodCodec(quickEditSettingsSchema.omit({ presets: true })))
	.version(2, zodCodec(quickEditSettingsSchema), (previous) => ({
		...previous,
		presets: createDefaultPresets(),
	}))
	.version(3, zodCodec(quickEditSettingsSchema), (previous) => ({
		...previous,
		presets: migratePresets(previous.presets),
	}))
	.build();
