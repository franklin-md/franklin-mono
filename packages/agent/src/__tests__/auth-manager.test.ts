import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';
import type { Filesystem } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { AuthManager } from '../auth/manager.js';

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

describe('AuthManager', () => {
	it('persists OAuth credentials returned by the platform flow', async () => {
		const filesystem = createFilesystem();
		const credentials = {
			accessToken: 'token',
		} as unknown as OAuthCredentials;
		const auth = new AuthManager({
			filesystem,
			ai: {
				getOAuthProviders: async () => [],
				getApiKeyProviders: async () => [],
			},
			createFlow: async () => ({
				onAuth: () => () => {},
				onProgress: () => () => {},
				onPrompt: () => () => {},
				respond: async () => {},
				login: async () => credentials,
				dispose: async () => {},
			}),
		});

		const flow = await auth.flow('anthropic');
		await flow.login();

		await expect(auth.load()).resolves.toEqual({
			anthropic: {
				oauth: {
					type: 'oauth',
					credentials,
				},
			},
		});
	});

	it('emits auth change events for store mutations', async () => {
		const auth = new AuthManager({
			filesystem: createFilesystem(),
			ai: {
				getOAuthProviders: async () => [],
				getApiKeyProviders: async () => [],
			},
			createFlow: async () => ({
				onAuth: () => () => {},
				onProgress: () => () => {},
				onPrompt: () => () => {},
				respond: async () => {},
				login: async () => ({}) as OAuthCredentials,
				dispose: async () => {},
			}),
		});
		const listener = vi.fn();
		auth.onAuthChange(listener);

		await auth.setApiKeyEntry('anthropic', {
			type: 'apiKey',
			key: 'sk-test',
		});

		expect(listener).toHaveBeenCalledWith('anthropic');
	});
});
