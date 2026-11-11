import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';

export const quickEditSettingsSchema = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: z.enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh']),
	instructions: z.string(),
});

export const quickEditSettingsCodec = versioned()
	.version(1, zodCodec(quickEditSettingsSchema))
	.build();
