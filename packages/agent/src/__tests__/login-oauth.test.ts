import type { OAuthCredentials } from '../auth/credentials.js';
import {
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { AuthManager } from '../auth/manager.js';
import type { OAuthClient } from '../auth/oauth-client.js';
import { createAuthStore } from '../auth/store.js';
import type { OAuthLoginCallbacks } from '../auth/types.js';
import type { Platform } from '../platform.js';

type RunFn = (
	providerId: string,
	callbacks: OAuthLoginCallbacks,
	signal: AbortSignal,
) => Promise<OAuthCredentials>;

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

function stubClient(run: RunFn): OAuthClient {
	return {
		run: vi.fn(run),
		refresh: vi.fn(),
		getApiKey: vi.fn(),
		providers: vi.fn(() => []),
	} as unknown as OAuthClient;
}

const TEST_APP_DIR = '/test/app' as AbsolutePath;

function waitForAbort(signal: AbortSignal): Promise<OAuthCredentials> {
	return new Promise((_resolve, reject) => {
		signal.addEventListener('abort', () =>
			reject(new DOMException('Aborted', 'AbortError')),
		);
	});
}

describe('AuthManager.loginOAuth', () => {
	it('drives the OAuth flow, forwards callbacks, and persists credentials', async () => {
		const filesystem = createFilesystem();
		const credentials: OAuthCredentials = {
			access: 'A',
			refresh: 'R',
			expires: 0,
		};
		const run = vi.fn<RunFn>(async (_id, callbacks) => {
			callbacks.onProgress?.('Waiting for browser');
			callbacks.onAuth({ url: 'https://example.com/auth' });
			return credentials;
		});
		const client = stubClient(run);
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			client,
		);
		const onAuth = vi.fn();
		const onProgress = vi.fn();

		await auth.loginOAuth('anthropic', { onAuth, onProgress });

		expect(run).toHaveBeenCalledWith(
			'anthropic',
			{ onAuth, onProgress },
			expect.any(AbortSignal),
		);
		expect(onProgress).toHaveBeenCalledWith('Waiting for browser');
		expect(onAuth).toHaveBeenCalledWith({ url: 'https://example.com/auth' });
		expect(auth.entries()).toEqual({
			anthropic: { oauth: { type: 'oauth', credentials } },
		});
	});
});

describe('AuthManager.cancel', () => {
	it('aborts a pending flow so the engine releases the port', async () => {
		const filesystem = createFilesystem();
		const client = stubClient((_id, _callbacks, signal) =>
			waitForAbort(signal),
		);
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			client,
		);

		const loginPromise = auth.loginOAuth('anthropic', { onAuth: vi.fn() });
		await Promise.resolve();

		await auth.cancel('anthropic');

		await expect(loginPromise).rejects.toThrow(/abort/i);
		expect(auth.entries()).toEqual({});
	});

	it('is a no-op when no flow is active for the provider', async () => {
		const filesystem = createFilesystem();
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
		);

		await expect(auth.cancel('anthropic')).resolves.toBeUndefined();
	});

	it('starting a second login for the same provider aborts the first', async () => {
		const filesystem = createFilesystem();
		const secondCredentials: OAuthCredentials = {
			access: 'A2',
			refresh: 'R2',
			expires: 0,
		};
		const run = vi
			.fn<RunFn>()
			.mockImplementationOnce((_id, _callbacks, signal) => waitForAbort(signal))
			.mockImplementationOnce(async () => secondCredentials);
		const client = stubClient(run);
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			client,
		);

		const firstLogin = auth.loginOAuth('anthropic', { onAuth: vi.fn() });
		await Promise.resolve();

		await auth.loginOAuth('anthropic', { onAuth: vi.fn() });

		await expect(firstLogin).rejects.toThrow(/abort/i);
		expect(auth.entries()).toEqual({
			anthropic: {
				oauth: { type: 'oauth', credentials: secondCredentials },
			},
		});
	});

	it('waits for the pending run to settle so the port is released before returning', async () => {
		const filesystem = createFilesystem();
		let resolveCleanup!: () => void;
		const cleanupSettled = new Promise<void>((resolve) => {
			resolveCleanup = resolve;
		});
		const client = stubClient(async (_id, _callbacks, signal) => {
			await new Promise<void>((resolve) =>
				signal.addEventListener('abort', () => resolve()),
			);
			// Simulate the engine's finally: listener.dispose takes a tick.
			await new Promise((resolve) => setTimeout(resolve, 0));
			resolveCleanup();
			throw new DOMException('Aborted', 'AbortError');
		});
		const auth = new AuthManager(
			createPlatform(filesystem),
			createAuthStore(filesystem, TEST_APP_DIR),
			client,
		);

		const login = auth.loginOAuth('anthropic', { onAuth: vi.fn() });
		login.catch(() => {});
		await Promise.resolve();

		let cleanupBeforeReturn = false;
		void cleanupSettled.then(() => {
			cleanupBeforeReturn = true;
		});

		await auth.cancel('anthropic');
		expect(cleanupBeforeReturn).toBe(true);
	});
});
