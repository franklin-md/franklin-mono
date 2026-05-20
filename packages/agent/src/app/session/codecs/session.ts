import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';
import type { FranklinSession } from '../types.js';
import { CoreSessionV1 } from './core.js';
import { EnvironmentSessionV1 } from './environment.js';
import { StoreSessionV1 } from './store.js';

export const SESSION_FILE_VERSION = 1;

export type FranklinSessionFileV1 = {
	version: typeof SESSION_FILE_VERSION;
	data: FranklinSession;
};

const FranklinSessionV1 = z.object({
	core: CoreSessionV1,
	store: StoreSessionV1,
	env: EnvironmentSessionV1,
}) satisfies z.ZodType<FranklinSession>;

export const franklinSessionCodec: Codec<FranklinSession> = versioned()
	.version(SESSION_FILE_VERSION, zodCodec(FranklinSessionV1))
	.build();
