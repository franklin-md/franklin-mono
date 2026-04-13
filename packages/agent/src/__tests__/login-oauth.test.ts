import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';
import { describe, expect, it, vi } from 'vitest';

import { loginOAuth } from '../auth/login.js';
import { OAuthFlow } from '../auth/oauth-flow.js';
import type { AuthManager } from '../auth/manager.js';

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

describe('loginOAuth', () => {
	it('drives the auth flow resource, persists credentials, and disposes it when finished', async () => {
		const { credentials, flow } = createFlow();
		const manager = {
			flow: vi.fn(async () => flow),
			setOAuthEntry: vi.fn(async () => {}),
		} satisfies Pick<AuthManager, 'flow' | 'setOAuthEntry'>;
		const loginSpy = vi.spyOn(flow, 'login');
		const respondSpy = vi.spyOn(flow, 'respond');
		const disposeSpy = vi.spyOn(flow, 'dispose');
		const onAuth = vi.fn();
		const onProgress = vi.fn();
		const onPrompt = vi.fn(async () => '1234');

		await loginOAuth('anthropic', manager, {
			onAuth,
			onProgress,
			onPrompt,
		});

		expect(manager.flow).toHaveBeenCalledWith('anthropic');
		expect(loginSpy).toHaveBeenCalledTimes(1);
		expect(onProgress).toHaveBeenCalledWith('Waiting for browser');
		expect(onAuth).toHaveBeenCalledWith({
			url: 'https://example.com/auth',
		});
		expect(onPrompt).toHaveBeenCalledWith({ message: 'Enter code' });
		expect(respondSpy).toHaveBeenCalledWith('1234');
		expect(manager.setOAuthEntry).toHaveBeenCalledWith('anthropic', {
			type: 'oauth',
			credentials,
		});
		expect(disposeSpy).toHaveBeenCalledTimes(1);
	});
});
