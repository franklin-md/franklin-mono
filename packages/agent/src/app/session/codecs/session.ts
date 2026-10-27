import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';
import type { FranklinSession } from '../types.js';
import { CoreSessionV1, CoreSessionV2 } from './core.js';
import { DetailsSessionV2 } from './details.js';
import { EnvironmentSessionV1 } from './environment.js';
import { StoreSessionV1 } from './store.js';
import { createMessageEntries } from '../../../modules/core/history/create.js';

export const SESSION_FILE_VERSION = 3;

const FranklinSessionV1 = z.object({
	core: CoreSessionV1,
	store: StoreSessionV1,
	env: EnvironmentSessionV1,
});

const FranklinSessionV2 = FranklinSessionV1.extend({
	details: DetailsSessionV2,
});

const FranklinSessionV3 = FranklinSessionV2.extend({
	core: CoreSessionV2,
}) satisfies z.ZodType<FranklinSession>;

export const franklinSessionCodec: Codec<FranklinSession> = versioned()
	.version(1, zodCodec(FranklinSessionV1))
	.version(2, zodCodec(FranklinSessionV2), (prev) => ({
		...prev,
		details: { visibility: 'visible' as const },
	}))
	.version(SESSION_FILE_VERSION, zodCodec(FranklinSessionV3), (prev) => {
		const { messages, ...core } = prev.core;
		return {
			...prev,
			core: { ...core, entries: createMessageEntries(messages, 'legacy') },
		};
	})
	.build();
