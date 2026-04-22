import type { OAuthCredentials } from '../auth/credentials.js';
import {
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { AuthManager } from '../auth/manager.js';
import type { OAuthClient } from '../auth/oauth-client.js';
import { OAuthFlow } from '../auth/oauth-flow.js';
import { createAuthStore } from '../auth/store.js';
import type { OAuthLoginCallbacks } from '../auth/types.js';
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

function createFlow(
	run?: (callbacks: OAuthLoginCallbacks) => Promise<OAuthCredentials>,
) {
	const credentials = {
		accessToken: 'token',
	} as unknown as OAuthCredentials;
	const flow = new OAuthFlow(
		run ??
			(async (callbacks) => {
				callbacks.onProgress?.('Waiting for browser');
				callbacks.onAuth({ url: 'https://example.com/auth' });
				return credentials;
			}),
	);

	return { credentials, flow };
}

describe('AuthManager.loginOAuth', () => {
	it('drives the OAuth flow, persists credentials, and disposes it when finished', async () => {
		const filesystem = createFilesystem();
		const { credentials, flow } = createFlow();
		const platform = createPlatform(filesystem);
		const oauthClient = {
			createFlow: vi.fn(() => flow),
			refresh: vi.fn(),
			getApiKey: vi.fn(),
			providers: vi.fn(() => []),
		} as unknown as OAuthClient;
		const auth = new AuthManager(
			platform,
			createAuthStore(filesystem, '/test/app' as AbsolutePath),
			oauthClient,
		);
		const loginSpy = vi.spyOn(flow, 'login');
		const disposeSpy = vi.spyOn(flow, 'dispose');
		const onAuth = vi.fn();
		const onProgress = vi.fn();

		await auth.loginOAuth('anthropic', {
			onAuth,
			onProgress,
		});

		expect(oauthClient.createFlow).toHaveBeenCalledWith('anthropic');
		expect(loginSpy).toHaveBeenCalledTimes(1);
		expect(onProgress).toHaveBeenCalledWith('Waiting for browser');
		expect(onAuth).toHaveBeenCalledWith({
			url: 'https://example.com/auth',
		});
		expect(auth.entries()).toEqual({
			anthropic: {
				oauth: {
					type: 'oauth',
					credentials,
				},
			},
		});
		expect(disposeSpy).toHaveBeenCalledTimes(1);
	});
});
