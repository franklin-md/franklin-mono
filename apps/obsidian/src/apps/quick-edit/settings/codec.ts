import { versioned, zodCodec } from '@franklin/lib';
import { createDefaultPresets } from '../presets/defaults.js';
import { legacySettingsSchema } from './legacy/v3.js';
import { migratePresetIcons } from './migrate-icons.js';
import { migratePresets } from './migrate-presets.js';
import { quickEditSettingsSchema } from './schema.js';

export const quickEditSettingsCodec = versioned()
	.version(1, zodCodec(legacySettingsSchema.omit({ presets: true })))
	.version(2, zodCodec(legacySettingsSchema), (previous) => ({
		...previous,
		presets: createDefaultPresets(),
	}))
	.version(3, zodCodec(legacySettingsSchema), (previous) => ({
		...previous,
		presets: migratePresets(previous.presets),
	}))
	.version(4, zodCodec(quickEditSettingsSchema), (previous) => ({
		...previous,
		presets: migratePresetIcons(previous.presets),
	}))
	.build();
