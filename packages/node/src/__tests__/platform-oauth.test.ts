import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mariozechner/pi-ai', () => ({
	getProviders: vi.fn(() => []),
}));

vi.mock('@mariozechner/pi-ai/oauth', () => ({
	getOAuthProvider: vi.fn(),
	getOAuthProviders: vi.fn(() => []),
}));

describe('createNodePlatform OAuth adapter', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('does not expose manual code input for callback-server providers', async () => {
		const oauth = await import('@mariozechner/pi-ai/oauth');

		vi.mocked(oauth.getOAuthProvider).mockReturnValue({
			id: 'anthropic',
			name: 'Anthropic',
			login: async (callbacks) => {
				callbacks.onAuth({ url: 'https://example.com/auth' });
				expect(callbacks.onManualCodeInput).toBeUndefined();
				return {
					access: 'access-token',
					refresh: 'refresh-token',
					expires: Date.now() + 60_000,
				};
			},
			refreshToken: vi.fn(),
			getApiKey: vi.fn(() => 'api-key'),
			usesCallbackServer: true,
		});

		const { createNodePlatform } = await import('../platform/index.js');
		const platform = createNodePlatform({ appDir: '/tmp' });
		const flow = await platform.createFlow('anthropic');

		await expect(flow.login()).resolves.toMatchObject({
			access: 'access-token',
			refresh: 'refresh-token',
		});
	});

	it('rejects provider fallback to manual prompt input outside OAuthFlow', async () => {
		const oauth = await import('@mariozechner/pi-ai/oauth');

		vi.mocked(oauth.getOAuthProvider).mockReturnValue({
			id: 'anthropic',
			name: 'Anthropic',
			login: async (callbacks) => {
				callbacks.onAuth({ url: 'https://example.com/auth' });
				await callbacks.onPrompt({ message: 'Paste the redirect URL' });
				return {
					access: 'access-token',
					refresh: 'refresh-token',
					expires: Date.now() + 60_000,
				};
			},
			refreshToken: vi.fn(),
			getApiKey: vi.fn(() => 'api-key'),
			usesCallbackServer: true,
		});

		const { createNodePlatform } = await import('../platform/index.js');
		const platform = createNodePlatform({ appDir: '/tmp' });
		const flow = await platform.createFlow('anthropic');

		await expect(flow.login()).rejects.toThrow(
			'OAuth manual code entry is not supported in Franklin desktop flows',
		);
	});
});
