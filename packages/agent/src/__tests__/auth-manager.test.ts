import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';
import type { Filesystem } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { AuthManager } from '../auth/manager.js';
import { OAuthFlow } from '../auth/oauth-flow.js';

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
	it('returns OAuth credentials from the platform flow without persisting them', async () => {
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
			createFlow: async () => new OAuthFlow(async () => credentials),
		});

		const flow = await auth.flow('anthropic');
		await expect(flow.login()).resolves.toBe(credentials);

		await expect(auth.load()).resolves.toEqual({});
	});

	it('persists OAuth entries explicitly', async () => {
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
			createFlow: async () => new OAuthFlow(async () => credentials),
		});

		await auth.setOAuthEntry('anthropic', {
			type: 'oauth',
			credentials,
		});

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
			createFlow: async () =>
				new OAuthFlow(async () => ({}) as OAuthCredentials),
		});
		const listener = vi.fn();
		auth.onAuthChange(listener);

		await auth.setApiKeyEntry('anthropic', {
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
});
