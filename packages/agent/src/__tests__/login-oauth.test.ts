import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { AuthManager } from '../auth/manager.js';
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

function createPlatform(
	filesystem: Filesystem,
	createFlow: Platform['createFlow'],
): Platform {
	return {
		spawn: vi.fn(async () => {
			throw new Error('not implemented');
		}),
		environment: vi.fn(async () => {
			throw new Error('not implemented');
		}),
		os: {
			terminal: {
				exec: vi.fn(async () => ({
					exit_code: 0,
					stdout: '',
					stderr: '',
				})),
			},
			filesystem,
			getHome: vi.fn(async () => '/home/test' as AbsolutePath),
			openExternal: vi.fn(async () => {}),
		},
		ai: {
			getOAuthProviders: async () => [],
			getApiKeyProviders: async () => [],
		},
		createFlow,
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
	it('drives the auth flow resource, persists credentials, and disposes it when finished', async () => {
		const filesystem = createFilesystem();
		const { credentials, flow } = createFlow();
		const platform = createPlatform(
			filesystem,
			vi.fn(async () => flow),
		);
		const auth = new AuthManager(
			platform,
			createAuthStore(filesystem, '/test/app' as AbsolutePath),
		);
		const loginSpy = vi.spyOn(flow, 'login');
		const disposeSpy = vi.spyOn(flow, 'dispose');
		const onAuth = vi.fn();
		const onProgress = vi.fn();

		await auth.loginOAuth('anthropic', {
			onAuth,
			onProgress,
		});

		expect(platform.createFlow).toHaveBeenCalledWith('anthropic');
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
