import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';
import type { Filesystem } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { AuthManager } from '../auth/manager.js';
import { OAuthFlow } from '../auth/oauth-flow.js';
import { DEFAULT_AUTH_PATH } from '../auth/store.js';
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

describe('AuthManager', () => {
	it('returns OAuth credentials from the platform flow without persisting them', async () => {
		const filesystem = createFilesystem();
		const credentials = {
			accessToken: 'token',
		} as unknown as OAuthCredentials;
		const auth = new AuthManager(
			createPlatform(
				filesystem,
				async () => new OAuthFlow(async () => credentials),
			),
		);

		const flow = await auth.flow('anthropic');
		await expect(flow.login()).resolves.toBe(credentials);

		expect(auth.entries()).toEqual({});
	});

	it('persists OAuth entries explicitly', async () => {
		const filesystem = createFilesystem();
		const credentials = {
			accessToken: 'token',
		} as unknown as OAuthCredentials;
		const auth = new AuthManager(
			createPlatform(
				filesystem,
				async () => new OAuthFlow(async () => credentials),
			),
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
			DEFAULT_AUTH_PATH,
			JSON.stringify({
				anthropic: {
					apiKey: {
						type: 'apiKey',
						key: 'sk-test',
					},
				},
			}),
		);
		vi.mocked(filesystem.writeFile).mockClear();
		const auth = new AuthManager(
			createPlatform(
				filesystem,
				async () => new OAuthFlow(async () => ({}) as OAuthCredentials),
			),
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
			DEFAULT_AUTH_PATH,
			JSON.stringify({
				anthropic: {
					apiKey: {
						type: 'apiKey',
						key: 'sk-test',
					},
				},
			}),
		);
		const auth = new AuthManager(
			createPlatform(
				filesystem,
				async () => new OAuthFlow(async () => ({}) as OAuthCredentials),
			),
		);
		const listener = vi.fn();
		auth.onAuthChange(listener);

		await auth.restore();

		expect(listener).not.toHaveBeenCalled();
	});

	it('emits auth change events for store mutations', async () => {
		const auth = new AuthManager(
			createPlatform(
				createFilesystem(),
				async () => new OAuthFlow(async () => ({}) as OAuthCredentials),
			),
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
		const auth = new AuthManager(
			createPlatform(
				createFilesystem(),
				async () => new OAuthFlow(async () => ({}) as OAuthCredentials),
			),
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
});
