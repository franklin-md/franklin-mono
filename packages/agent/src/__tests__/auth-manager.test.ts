import type { OAuthCredentials } from '../auth/credentials.js';
import {
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { AuthManager } from '../auth/manager.js';
import { OAuthFlow } from '../auth/oauth-flow.js';
import type { OAuthClient } from '../auth/oauth-client.js';
import { createAuthStore, DEFAULT_AUTH_FILE } from '../auth/store.js';
import { joinAbsolute } from '@franklin/lib';
import type { Platform } from '../platform.js';

function createFilesystem(): Filesystem {
	const files = new Map<string, Buffer>();

	return {
		readFile: vi.fn(async (path: string) => {
			const file = files.get(path);
			if (!file) {
				throw new Error(`File not found: ${path}`);
			}
			return file;
		}),
		writeFile: vi.fn(async (path: string, data: Uint8Array | string) => {
			files.set(
				path,
				typeof data === 'string' ? Buffer.from(data) : Buffer.from(data),
			);
		}),
		mkdir: vi.fn(async () => {}),
		access: vi.fn(async () => {}),
		stat: vi.fn(async () => ({ isFile: true, isDirectory: false })),
		readdir: vi.fn(async () => []),
		exists: vi.fn(async (path: string) => files.has(path)),
		glob: vi.fn(async () => []),
		deleteFile: vi.fn(async (path: string) => {
			files.delete(path);
		}),
		resolve: vi.fn(
			async (...paths: string[]) => paths.join('/') as AbsolutePath,
		),
	};
}

function stubClient(flow: OAuthFlow): OAuthClient {
	return {
		createFlow: vi.fn(() => flow),
		refresh: vi.fn(),
		getApiKey: vi.fn((_id: string, creds: OAuthCredentials) => creds.access),
		providers: vi.fn(() => []),
	} as unknown as OAuthClient;
}

function createPlatform(filesystem: Filesystem): Platform {
	return {
		spawn: vi.fn(async () => {
			throw new Error('not implemented');
		}),
		environment: vi.fn(async () => {
			throw new Error('not implemented');
		}),
		os: {
			process: {
				exec: vi.fn(async () => ({
					exit_code: 0,
					stdout: '',
					stderr: '',
				})),
			},
			filesystem,
			osInfo: new MemoryOsInfo(),
			openExternal: vi.fn(async () => {}),
			net: {
				listenLoopback: vi.fn(async () => {
					throw new Error('not implemented');
				}),
				fetch: vi.fn(async () => {
					throw new Error('not implemented');
				}),
			},
		},
		ai: {
			getApiKeyProviders: async () => [],
		},
	};
}

const TEST_APP_DIR = '/test/app' as AbsolutePath;
const TEST_AUTH_PATH = joinAbsolute(TEST_APP_DIR, DEFAULT_AUTH_FILE);

describe('AuthManager', () => {
	it('returns OAuth credentials from the OAuth client flow without persisting them', async () => {
		const filesystem = createFilesystem();
		const credentials = {
			accessToken: 'token',
		} as unknown as OAuthCredentials;
		const flow = new OAuthFlow(async () => credentials);
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			stubClient(flow),
		);

		await expect(auth.flow('anthropic').login()).resolves.toBe(credentials);

		expect(auth.entries()).toEqual({});
	});

	it('persists OAuth entries explicitly', async () => {
		const filesystem = createFilesystem();
		const credentials = {
			accessToken: 'token',
		} as unknown as OAuthCredentials;
		const flow = new OAuthFlow(async () => credentials);
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			stubClient(flow),
		);

		auth.setOAuthEntry('anthropic', {
			type: 'oauth',
			credentials,
		});

		expect(auth.entries()).toEqual({
			anthropic: {
				oauth: {
					type: 'oauth',
					credentials,
				},
			},
		});
	});

	it('restores persisted entries without writing them back during hydration', async () => {
		const filesystem = createFilesystem();
		await filesystem.writeFile(
			TEST_AUTH_PATH,
			JSON.stringify({
				version: 1,
				data: {
					anthropic: {
						apiKey: {
							type: 'apiKey',
							key: 'sk-test',
						},
					},
				},
			}),
		);
		vi.mocked(filesystem.writeFile).mockClear();
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
		);

		await auth.restore();

		expect(auth.entries()).toEqual({
			anthropic: {
				apiKey: {
					type: 'apiKey',
					key: 'sk-test',
				},
			},
		});
		expect(filesystem.writeFile).not.toHaveBeenCalled();
	});

	it('does not emit auth change events during restore', async () => {
		const filesystem = createFilesystem();
		await filesystem.writeFile(
			TEST_AUTH_PATH,
			JSON.stringify({
				version: 1,
				data: {
					anthropic: {
						apiKey: {
							type: 'apiKey',
							key: 'sk-test',
						},
					},
				},
			}),
		);
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
		);
		const listener = vi.fn();
		auth.onAuthChange(listener);

		await auth.restore();

		expect(listener).not.toHaveBeenCalled();
	});

	it('emits auth change events for store mutations', async () => {
		const filesystem = createFilesystem();
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
		);
		const listener = vi.fn();
		auth.onAuthChange(listener);

		auth.setApiKeyEntry('anthropic', {
			type: 'apiKey',
			key: 'sk-test',
		});

		expect(listener).toHaveBeenCalledWith('anthropic', {
			apiKey: {
				type: 'apiKey',
				key: 'sk-test',
			},
		});
	});

	it('emits provider removals as undefined entries', async () => {
		const filesystem = createFilesystem();
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
		);
		const listener = vi.fn();
		auth.onAuthChange(listener);

		auth.setApiKeyEntry('anthropic', {
			type: 'apiKey',
			key: 'sk-test',
		});
		listener.mockClear();

		auth.removeApiKeyEntry('anthropic');

		expect(listener).toHaveBeenCalledWith('anthropic', undefined);
	});

	it('getApiKey returns the current access token when not expired', async () => {
		const filesystem = createFilesystem();
		const client = {
			createFlow: vi.fn(),
			refresh: vi.fn(),
			getApiKey: vi.fn(() => 'api-key'),
			providers: vi.fn(() => []),
		} as unknown as OAuthClient;
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			client,
		);
		auth.setOAuthEntry('anthropic', {
			type: 'oauth',
			credentials: {
				access: 'access',
				refresh: 'refresh',
				expires: Date.now() + 60_000,
			},
		});

		await expect(auth.getApiKey('anthropic')).resolves.toBe('api-key');
		expect(client.refresh).not.toHaveBeenCalled();
	});

	it('getApiKey refreshes expired credentials and persists the new ones', async () => {
		const filesystem = createFilesystem();
		const refreshed = {
			access: 'new-access',
			refresh: 'new-refresh',
			expires: Date.now() + 60_000,
		};
		const client = {
			createFlow: vi.fn(),
			refresh: vi.fn(async () => refreshed),
			getApiKey: vi.fn((_id: string, creds: OAuthCredentials) => creds.access),
			providers: vi.fn(() => []),
		} as unknown as OAuthClient;
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			client,
		);
		auth.setOAuthEntry('anthropic', {
			type: 'oauth',
			credentials: {
				access: 'stale',
				refresh: 'stale-refresh',
				expires: 0,
			},
		});

		const apiKey = await auth.getApiKey('anthropic');

		expect(apiKey).toBe('new-access');
		expect(client.refresh).toHaveBeenCalledWith(
			'anthropic',
			expect.objectContaining({ access: 'stale' }),
		);
		expect(auth.entries().anthropic?.oauth?.credentials).toEqual(refreshed);
	});
});
