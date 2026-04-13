import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';
import type { Filesystem } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { AuthManager } from '../auth/manager.js';
import { OAuthFlow } from '../auth/oauth-flow.js';
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
		resolve: vi.fn(async (...paths: string[]) => paths.join('/')),
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
		filesystem,
		ai: {
			getOAuthProviders: async () => [],
			getApiKeyProviders: async () => [],
		},
		createFlow,
		openExternal: vi.fn(async () => {}),
	};
}

function createFlow() {
	const credentials = {
		accessToken: 'token',
	} as unknown as OAuthCredentials;
	const flow = new OAuthFlow(async (callbacks) => {
		callbacks.onProgress?.('Waiting for browser');
		callbacks.onAuth({ url: 'https://example.com/auth' });
		await callbacks.onPrompt({ message: 'Enter code' });
		return credentials;
	});

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
		const auth = new AuthManager(platform);
		const loginSpy = vi.spyOn(flow, 'login');
		const respondSpy = vi.spyOn(flow, 'respond');
		const disposeSpy = vi.spyOn(flow, 'dispose');
		const onAuth = vi.fn();
		const onProgress = vi.fn();
		const onPrompt = vi.fn(async () => '1234');

		await auth.loginOAuth('anthropic', {
			onAuth,
			onProgress,
			onPrompt,
		});

		expect(platform.createFlow).toHaveBeenCalledWith('anthropic');
		expect(loginSpy).toHaveBeenCalledTimes(1);
		expect(onProgress).toHaveBeenCalledWith('Waiting for browser');
		expect(onAuth).toHaveBeenCalledWith({
			url: 'https://example.com/auth',
		});
		expect(onPrompt).toHaveBeenCalledWith({ message: 'Enter code' });
		expect(respondSpy).toHaveBeenCalledWith('1234');
		await expect(auth.load()).resolves.toEqual({
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
