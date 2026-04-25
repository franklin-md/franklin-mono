import { describe, expect, it } from 'vitest';
import type { AuthEntries, OAuthCredentials } from '@franklin/agent/browser';
import { MemorySecretStorage } from '../memory-secret-storage.js';
import { toApiKeyName, toOAuthName } from '../key-names.js';
import {
	decodeApiKey,
	decodeOAuth,
	encodeApiKey,
	encodeOAuth,
} from '../schema.js';
import { createObsidianAuthStore } from '../store.js';

describe('toApiKeyName / toOAuthName', () => {
	it('produces the expected keychain key names', () => {
		expect(toApiKeyName('openrouter')).toBe('openrouter-api-key');
		expect(toOAuthName('openrouter')).toBe('openrouter-oauth');
		expect(toApiKeyName('pi-ai')).toBe('pi-ai-api-key');
		expect(toOAuthName('pi-ai')).toBe('pi-ai-oauth');
	});
});

// ---------------------------------------------------------------------------
// Field codecs
// ---------------------------------------------------------------------------

describe('apiKey codec', () => {
	it('encodes to the raw key string', () => {
		expect(encodeApiKey({ type: 'apiKey', key: 'sk-test' })).toBe('sk-test');
	});

	it('decodes a non-empty string back to ApiKeyEntry', () => {
		expect(decodeApiKey('sk-test')).toEqual({ type: 'apiKey', key: 'sk-test' });
	});

	it('returns null for an empty string (tombstone)', () => {
		expect(decodeApiKey('')).toBeNull();
	});
});

const CREDENTIALS: OAuthCredentials = {
	access: 'access-token',
	refresh: 'refresh-token',
	expires: 9999,
	accountId: 'user-123',
};

describe('oauth codec', () => {
	it('encodes credentials to JSON string', () => {
		const entry = { type: 'oauth' as const, credentials: CREDENTIALS };
		expect(encodeOAuth(entry)).toBe(JSON.stringify(CREDENTIALS));
	});

	it('decodes JSON credentials back to OAuthEntry', () => {
		const entry = { type: 'oauth' as const, credentials: CREDENTIALS };
		expect(decodeOAuth(JSON.stringify(CREDENTIALS))).toEqual(entry);
	});

	it('passes through unknown fields (forward-compat)', () => {
		const extended = { ...CREDENTIALS, futureField: 'x' };
		const result = decodeOAuth(JSON.stringify(extended));
		expect(result).not.toBeNull();
		expect(
			(result!.credentials as Record<string, unknown>)['futureField'],
		).toBe('x');
	});

	it('returns null for corrupt JSON', () => {
		expect(decodeOAuth('not-json')).toBeNull();
	});

	it('returns null for missing required fields', () => {
		expect(decodeOAuth(JSON.stringify({ access: 'only-access' }))).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Store integration
// ---------------------------------------------------------------------------

const PROVIDER = 'openrouter';
const API_ENTRY = { apiKey: { type: 'apiKey' as const, key: 'sk-test' } };
const OAUTH_ENTRY = {
	oauth: { type: 'oauth' as const, credentials: CREDENTIALS },
};

describe('createObsidianAuthStore', () => {
	it('restore() on empty keychain returns empty AuthEntries', async () => {
		const storage = new MemorySecretStorage();
		const store = createObsidianAuthStore(storage);

		const result = await store.restore();

		expect(result.issues).toHaveLength(0);
		expect(store.get()).toEqual({});
	});

	it('restore() reads from per-field keys written by persist()', async () => {
		const storage = new MemorySecretStorage();
		const entries: AuthEntries = { [PROVIDER]: API_ENTRY };

		// Pre-seed as persist() would write
		storage.setSecret('franklin-providers', JSON.stringify([PROVIDER]));
		storage.setSecret('openrouter-api-key', 'sk-test');
		storage.setSecret('openrouter-oauth', '');

		const store = createObsidianAuthStore(storage);
		await store.restore();

		expect(store.get()).toEqual(entries);
	});

	it('persist() writes raw API key to PROVIDER_API_KEY', async () => {
		const storage = new MemorySecretStorage();
		const store = createObsidianAuthStore(storage);
		await store.restore();

		store.set(() => ({ [PROVIDER]: API_ENTRY }));
		await new Promise((r) => setTimeout(r, 0));

		expect(storage.getSecret('openrouter-api-key')).toBe('sk-test');
		expect(storage.getSecret('franklin-providers')).toBe(
			JSON.stringify([PROVIDER]),
		);
	});

	it('persist() writes serialized credentials to PROVIDER_OAUTH', async () => {
		const storage = new MemorySecretStorage();
		const store = createObsidianAuthStore(storage);
		await store.restore();

		store.set(() => ({ [PROVIDER]: OAUTH_ENTRY }));
		await new Promise((r) => setTimeout(r, 0));

		expect(storage.getSecret('openrouter-oauth')).toBe(
			JSON.stringify(CREDENTIALS),
		);
	});

	it('removing a provider tombstones its keys and removes from index', async () => {
		const storage = new MemorySecretStorage();
		const store = createObsidianAuthStore(storage);
		await store.restore();

		store.set(() => ({ [PROVIDER]: API_ENTRY }));
		await new Promise((r) => setTimeout(r, 0));

		store.set(() => ({}));
		await new Promise((r) => setTimeout(r, 0));

		expect(storage.getSecret('openrouter-api-key')).toBe('');
		expect(storage.getSecret('openrouter-oauth')).toBe('');
		expect(JSON.parse(storage.getSecret('franklin-providers')!)).toEqual([]);
	});

	it('persist() then restore() round-trips API key correctly', async () => {
		const storage = new MemorySecretStorage();

		const storeA = createObsidianAuthStore(storage);
		await storeA.restore();
		storeA.set(() => ({ [PROVIDER]: API_ENTRY }));
		await new Promise((r) => setTimeout(r, 0));

		const storeB = createObsidianAuthStore(storage);
		await storeB.restore();

		expect(storeB.get()).toEqual({ [PROVIDER]: API_ENTRY });
	});

	it('persist() then restore() round-trips OAuth credentials correctly', async () => {
		const storage = new MemorySecretStorage();

		const storeA = createObsidianAuthStore(storage);
		await storeA.restore();
		storeA.set(() => ({ [PROVIDER]: OAUTH_ENTRY }));
		await new Promise((r) => setTimeout(r, 0));

		const storeB = createObsidianAuthStore(storage);
		await storeB.restore();

		expect(storeB.get()).toEqual({ [PROVIDER]: OAUTH_ENTRY });
	});
});
