import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mariozechner/pi-ai/oauth', () => ({
	getOAuthApiKey: vi.fn(),
	getOAuthProvider: vi.fn(),
}));

import { getOAuthApiKey, getOAuthProvider } from '@mariozechner/pi-ai/oauth';
import type { Agent } from '@franklin/agent';

import { configureAgent } from '../client.js';
import { loginOAuth, setApiKey } from '../login.js';
import { AuthStore } from '../store.js';
import type { AuthFile, OAuthCredentials } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGetOAuthApiKey = vi.mocked(getOAuthApiKey);
const mockGetOAuthProvider = vi.mocked(getOAuthProvider);

function makeCredentials(
	overrides: Partial<OAuthCredentials> = {},
): OAuthCredentials {
	return {
		refresh: 'refresh-token',
		access: 'access-token',
		expires: Date.now() + 3_600_000,
		...overrides,
	};
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		// eslint-disable-next-line require-yield
		prompt: vi.fn(async function* () {
			return { type: 'turnEnd' as const };
		}),
		cancel: vi.fn(async () => ({ type: 'turnEnd' as const })),
		toolExecute: vi.fn(async () => ({
			toolCallId: '1',
			content: [],
			isError: false,
		})),
		stores: {} as Agent['stores'],
		dispose: vi.fn(async () => {}),
		signal: new AbortController().signal,
		closed: Promise.resolve(),
		...overrides,
	} as unknown as Agent;
}

function apiKeyStoreEntry(key: string) {
	return {
		apiKey: { type: 'apiKey' as const, key },
	};
}

function oauthStoreEntry(credentials: OAuthCredentials) {
	return {
		oauth: { type: 'oauth' as const, credentials },
	};
}

function readAuthFile(path: string): AuthFile {
	return JSON.parse(readFileSync(path, 'utf-8')) as AuthFile;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let tempDir: string;
let authPath: string;
let store: AuthStore;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'franklin-auth-test-'));
	authPath = join(tempDir, 'auth.json');
	store = new AuthStore(authPath);
	vi.clearAllMocks();
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// AuthStore — persistence
// ---------------------------------------------------------------------------

describe('AuthStore.load()', () => {
	it('returns empty object when the auth file does not exist', () => {
		expect(store.load()).toEqual({});
	});

	it('returns empty object when the auth file contains invalid JSON', () => {
		const badPath = join(tempDir, 'bad.json');
		writeFileSync(badPath, 'not-json', 'utf-8');
		const badStore = new AuthStore(badPath);
		expect(badStore.load()).toEqual({});
	});
});

describe('AuthStore.setEntry() / getEntry()', () => {
	it('round-trips an apiKey entry', () => {
		store.setEntry('openai', apiKeyStoreEntry('sk-test'));
		expect(store.getEntry('openai')).toEqual(apiKeyStoreEntry('sk-test'));
	});

	it('round-trips an OAuth entry', () => {
		const creds = makeCredentials();
		store.setEntry('anthropic', oauthStoreEntry(creds));
		expect(store.getEntry('anthropic')).toEqual(oauthStoreEntry(creds));
	});

	it('returns undefined for an unknown provider', () => {
		expect(store.getEntry('unknown-provider')).toBeUndefined();
	});

	it('creates the parent directory when it does not exist', () => {
		const nested = join(tempDir, 'deep', 'nested', 'auth.json');
		const nestedStore = new AuthStore(nested);
		nestedStore.setEntry('openai', apiKeyStoreEntry('sk-x'));
		expect(nestedStore.getEntry('openai')).toEqual(apiKeyStoreEntry('sk-x'));
	});

	it('persists multiple providers without clobbering', () => {
		store.setEntry('openai', apiKeyStoreEntry('sk-openai'));
		store.setEntry('anthropic', apiKeyStoreEntry('sk-anthropic'));

		const file = readAuthFile(authPath);
		expect(Object.keys(file)).toHaveLength(2);
		expect(file['openai']).toEqual(apiKeyStoreEntry('sk-openai'));
		expect(file['anthropic']).toEqual(apiKeyStoreEntry('sk-anthropic'));
	});

	it('overwrites an existing entry for the same provider', () => {
		store.setEntry('openai', apiKeyStoreEntry('old-key'));
		store.setEntry('openai', apiKeyStoreEntry('new-key'));
		expect(store.getEntry('openai')).toEqual(apiKeyStoreEntry('new-key'));
	});
});

describe('AuthStore.removeEntry()', () => {
	it('removes an existing entry', () => {
		store.setEntry('openai', apiKeyStoreEntry('sk-test'));
		store.removeEntry('openai');
		expect(store.getEntry('openai')).toBeUndefined();
	});

	it('is a no-op for an entry that does not exist', () => {
		// Should not throw
		expect(() => store.removeEntry('nonexistent')).not.toThrow();
	});

	it('leaves other entries intact', () => {
		store.setEntry('openai', apiKeyStoreEntry('sk-openai'));
		store.setEntry('anthropic', apiKeyStoreEntry('sk-anthropic'));
		store.removeEntry('openai');

		expect(store.getEntry('openai')).toBeUndefined();
		expect(store.getEntry('anthropic')).toEqual(apiKeyStoreEntry('sk-anthropic'));
	});
});

// ---------------------------------------------------------------------------
// AuthStore — getApiKey
// ---------------------------------------------------------------------------

describe('AuthStore.getApiKey()', () => {
	it('returns undefined when no credentials are stored for the provider', async () => {
		await expect(store.getApiKey('openai')).resolves.toBeUndefined();
	});

	it('returns the key directly for an apiKey entry', async () => {
		store.setEntry('openai', apiKeyStoreEntry('sk-direct'));
		await expect(store.getApiKey('openai')).resolves.toBe('sk-direct');
	});

	it('calls getOAuthApiKey for an OAuth entry', async () => {
		const creds = makeCredentials();
		store.setEntry('anthropic', oauthStoreEntry(creds));

		mockGetOAuthApiKey.mockResolvedValueOnce({
			newCredentials: creds,
			apiKey: 'oauth-api-key',
		});

		const key = await store.getApiKey('anthropic');

		expect(key).toBe('oauth-api-key');
		expect(mockGetOAuthApiKey).toHaveBeenCalledWith('anthropic', {
			anthropic: creds,
		});
	});

	it('persists refreshed OAuth credentials when they change', async () => {
		const oldCreds = makeCredentials({
			access: 'old-access',
			expires: Date.now() - 1,
		});
		const newCreds = makeCredentials({
			access: 'new-access',
			expires: Date.now() + 3_600_000,
		});
		store.setEntry('anthropic', oauthStoreEntry(oldCreds));

		mockGetOAuthApiKey.mockResolvedValueOnce({
			newCredentials: newCreds,
			apiKey: 'refreshed-key',
		});

		await store.getApiKey('anthropic');

		const stored = store.getEntry('anthropic');
		expect(stored).toEqual(oauthStoreEntry(newCreds));
	});

	it('always persists newCredentials returned by getOAuthApiKey', async () => {
		const creds = makeCredentials();
		const updatedCreds = { ...creds, someField: 'extra' };
		store.setEntry('anthropic', oauthStoreEntry(creds));

		mockGetOAuthApiKey.mockResolvedValueOnce({
			newCredentials: updatedCreds,
			apiKey: 'same-key',
		});

		await store.getApiKey('anthropic');

		// Returned newCredentials are written back regardless
		expect(store.getEntry('anthropic')).toEqual(oauthStoreEntry(updatedCreds));
	});

	it('returns undefined when getOAuthApiKey returns null', async () => {
		const creds = makeCredentials();
		store.setEntry('anthropic', oauthStoreEntry(creds));
		mockGetOAuthApiKey.mockResolvedValueOnce(null);

		await expect(store.getApiKey('anthropic')).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// loginOAuth
// ---------------------------------------------------------------------------

describe('loginOAuth()', () => {
	const callbacks = {
		onAuth: vi.fn(),
		onPrompt: vi.fn(async () => ''),
		onProgress: vi.fn(),
	};

	it('calls login on the OAuth provider with the given callbacks', async () => {
		const creds = makeCredentials();
		const mockLogin = vi.fn(async () => creds);
		mockGetOAuthProvider.mockReturnValue({ login: mockLogin } as any);

		await loginOAuth('anthropic', store, callbacks);

		expect(mockGetOAuthProvider).toHaveBeenCalledWith('anthropic');
		expect(mockLogin).toHaveBeenCalledWith(callbacks);
	});

	it('persists the returned credentials to the store', async () => {
		const creds = makeCredentials();
		mockGetOAuthProvider.mockReturnValue({
			login: vi.fn(async () => creds),
		} as any);

		await loginOAuth('anthropic', store, callbacks);

		expect(store.getEntry('anthropic')).toEqual(oauthStoreEntry(creds));
	});

	it('throws when the provider is not registered in pi-ai', async () => {
		mockGetOAuthProvider.mockReturnValue(undefined as any);

		await expect(
			loginOAuth('unknown-provider', store, callbacks),
		).rejects.toThrow('Unknown OAuth provider: "unknown-provider"');
	});

	it('does not write to the store when login throws', async () => {
		mockGetOAuthProvider.mockReturnValue({
			login: vi.fn(async () => {
				throw new Error('Login failed');
			}),
		} as any);

		await expect(loginOAuth('anthropic', store, callbacks)).rejects.toThrow(
			'Login failed',
		);
		expect(store.getEntry('anthropic')).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// setApiKey
// ---------------------------------------------------------------------------

describe('setApiKey()', () => {
	it('stores the key as an apiKey entry', () => {
		setApiKey('openai', 'sk-test-key', store);
		expect(store.getEntry('openai')).toEqual(apiKeyStoreEntry('sk-test-key'));
	});

	it('overwrites an existing entry for the same provider', () => {
		setApiKey('openai', 'sk-old', store);
		setApiKey('openai', 'sk-new', store);
		expect(store.getEntry('openai')).toEqual(apiKeyStoreEntry('sk-new'));
	});

	it('preserves an existing OAuth entry when adding an apiKey entry', () => {
		const credentials = makeCredentials();
		store.setEntry('anthropic', oauthStoreEntry(credentials));
		setApiKey('anthropic', 'sk-direct', store);
		expect(store.getEntry('anthropic')).toEqual({
			oauth: { type: 'oauth', credentials },
			apiKey: { type: 'apiKey', key: 'sk-direct' },
		});
	});
});

// ---------------------------------------------------------------------------
// configureAgent
// ---------------------------------------------------------------------------

describe('configureAgent()', () => {
	it('calls setContext with provider and resolved apiKey', async () => {
		store.setEntry('anthropic', apiKeyStoreEntry('sk-anth'));
		const agent = makeAgent();

		await configureAgent(agent, store, { provider: 'anthropic' });

		expect(vi.mocked(agent.setContext)).toHaveBeenCalledWith({
			ctx: {
				config: {
					provider: 'anthropic',
					apiKey: 'sk-anth',
				},
			},
		});
	});

	it('includes model in the config when provided', async () => {
		store.setEntry('anthropic', apiKeyStoreEntry('sk-anth'));
		const agent = makeAgent();

		await configureAgent(agent, store, {
			provider: 'anthropic',
			model: 'claude-opus-4-6',
		});

		expect(vi.mocked(agent.setContext)).toHaveBeenCalledWith({
			ctx: {
				config: {
					provider: 'anthropic',
					model: 'claude-opus-4-6',
					apiKey: 'sk-anth',
				},
			},
		});
	});

	it('omits apiKey from config when no credentials are stored', async () => {
		const agent = makeAgent();

		await configureAgent(agent, store, { provider: 'anthropic' });

		expect(vi.mocked(agent.setContext)).toHaveBeenCalledWith({
			ctx: {
				config: {
					provider: 'anthropic',
				},
			},
		});
	});

	it('resolves an OAuth token and passes the apiKey to setContext', async () => {
		const creds = makeCredentials();
		store.setEntry('github-copilot', oauthStoreEntry(creds));

		mockGetOAuthApiKey.mockResolvedValueOnce({
			newCredentials: creds,
			apiKey: 'ghu_oauth-token',
		});

		const agent = makeAgent();
		await configureAgent(agent, store, { provider: 'github-copilot' });

		expect(vi.mocked(agent.setContext)).toHaveBeenCalledWith({
			ctx: {
				config: {
					provider: 'github-copilot',
					apiKey: 'ghu_oauth-token',
				},
			},
		});
	});

	it('refreshes an expired OAuth token and persists new credentials before calling setContext', async () => {
		const expiredCreds = makeCredentials({ expires: Date.now() - 1 });
		const freshCreds = makeCredentials({
			access: 'fresh-access',
			expires: Date.now() + 3_600_000,
		});
		store.setEntry('anthropic', oauthStoreEntry(expiredCreds));

		mockGetOAuthApiKey.mockResolvedValueOnce({
			newCredentials: freshCreds,
			apiKey: 'refreshed-key',
		});

		const agent = makeAgent();
		await configureAgent(agent, store, { provider: 'anthropic' });

		// Credentials persisted
		expect(store.getEntry('anthropic')).toEqual(oauthStoreEntry(freshCreds));

		// setContext received the fresh key
		expect(vi.mocked(agent.setContext)).toHaveBeenCalledWith({
			ctx: {
				config: {
					provider: 'anthropic',
					apiKey: 'refreshed-key',
				},
			},
		});
	});
});
