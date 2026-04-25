import { z } from 'zod';
import type {
	ApiKeyEntry,
	OAuthCredentials,
	OAuthEntry,
} from '@franklin/agent/browser';

const apiKeySchema = z.string().min(1);

// Mirrors the permissive approach in agent/auth/schema.ts — accepts extra fields
// from pi-ai credential changes without forcing a migration.
const oauthCredentialsSchema = z.looseObject({
	access: z.string(),
	refresh: z.string(),
	expires: z.number(),
	accountId: z.string().optional(),
});

export function encodeApiKey(entry: ApiKeyEntry): string {
	return entry.key;
}

export function decodeApiKey(raw: string): ApiKeyEntry | null {
	const result = apiKeySchema.safeParse(raw);
	if (!result.success) return null;
	return { type: 'apiKey', key: result.data };
}

export function encodeOAuth(entry: OAuthEntry): string {
	return JSON.stringify(entry.credentials);
}

export function decodeOAuth(raw: string): OAuthEntry | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	const result = oauthCredentialsSchema.safeParse(parsed);
	if (!result.success) return null;
	return { type: 'oauth', credentials: result.data as OAuthCredentials };
}
