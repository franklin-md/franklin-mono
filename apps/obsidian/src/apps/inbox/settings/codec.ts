import { versioned, zodCodec } from '@franklin/lib';
import { inboxSettingsSchema } from './schema.js';

export const inboxSettingsCodec = versioned()
	.version(1, zodCodec(inboxSettingsSchema))
	.build();
