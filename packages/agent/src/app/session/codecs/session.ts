import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';
import type { FranklinSession } from '../types.js';
import { CoreSessionV1 } from './core.js';
import { DetailsSessionV2 } from './details.js';
import { EnvironmentSessionV1 } from './environment.js';
import { StoreSessionV1 } from './store.js';

export const SESSION_FILE_VERSION = 2;

const FranklinSessionV1 = z.object({
	core: CoreSessionV1,
	store: StoreSessionV1,
	env: EnvironmentSessionV1,
});

const FranklinSessionV2 = FranklinSessionV1.extend({
	details: DetailsSessionV2,
}) satisfies z.ZodType<FranklinSession>;

export const franklinSessionCodec: Codec<FranklinSession> = versioned()
	.version(1, zodCodec(FranklinSessionV1))
	.version(SESSION_FILE_VERSION, zodCodec(FranklinSessionV2), (prev) => ({
		...prev,
		details: { visibility: 'visible' as const },
	}))
	.build();
