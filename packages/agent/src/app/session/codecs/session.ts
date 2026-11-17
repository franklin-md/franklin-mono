import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';
import type { FranklinSession } from '../types.js';
import { CoreSessionV1, CoreSessionV2 } from './core.js';
import { DetailsSessionV2 } from './details.js';
import { EnvironmentSessionV1, EnvironmentSessionV2 } from './environment.js';
import { StoreSessionV1 } from './store.js';

export const SESSION_FILE_VERSION = 4;

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
});

const FranklinSessionV4 = FranklinSessionV3.extend({
	env: EnvironmentSessionV2,
}) satisfies z.ZodType<FranklinSession>;

export const franklinSessionCodec: Codec<FranklinSession> = versioned()
	.version(1, zodCodec(FranklinSessionV1))
	.version(2, zodCodec(FranklinSessionV2), (prev) => ({
		...prev,
		details: { visibility: 'visible' as const },
	}))
	.version(3, zodCodec(FranklinSessionV3), (prev) => {
		const { messages, ...core } = prev.core;
		return {
			...prev,
			core: {
				...core,
				entries: messages.map((message) => ({
					type: 'message' as const,
					message: structuredClone(message),
				})),
			},
		};
	})
	.version(SESSION_FILE_VERSION, zodCodec(FranklinSessionV4), (prev) => ({
		...prev,
		env: {
			...prev.env,
			// Reset all legacy policies to the v4 default, including custom rules.
			// Freeze it here so future app defaults do not change old restores.
			netConfig: {
				allowedDomains: ['*'],
				deniedDomains: [],
			},
		},
	}))
	.build();
