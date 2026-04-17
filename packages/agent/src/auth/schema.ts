import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';
import type { AuthEntries } from './types.js';

// ---------------------------------------------------------------------------
// Version 1 — initial schema
//
// OAuthCredentials comes from pi-ai and may evolve independently. Permissive
// passthrough avoids forcing a migration here every time pi-ai ships a field.
// ---------------------------------------------------------------------------

const OAuthEntryV1 = z.object({
	type: z.literal('oauth'),
	credentials: z.looseObject({}),
});

const ApiKeyEntryV1 = z.object({
	type: z.literal('apiKey'),
	key: z.string(),
});

const AuthEntryV1 = z.object({
	oauth: OAuthEntryV1.optional(),
	apiKey: ApiKeyEntryV1.optional(),
});

const AuthEntriesV1 = z.record(
	z.string(),
	AuthEntryV1,
) as z.ZodType<AuthEntries>;

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export const authCodec: Codec<AuthEntries> = versioned()
	.version(1, zodCodec(AuthEntriesV1))
	.build();
