import { describe, expect, it, vi } from 'vitest';

import { loginOAuth } from '../auth/login.js';
import type { AppAuth, IAuthFlow } from '../auth/types.js';

function createFlow(): IAuthFlow {
	let onAuth:
		| ((info: { url: string; instructions?: string }) => void)
		| undefined;
	let onProgress: ((message: string) => void) | undefined;
	let onPrompt:
		| ((prompt: {
				message: string;
				placeholder?: string;
				allowEmpty?: boolean;
		  }) => void)
		| undefined;
	let resolvePrompt = () => {};
	const promptResolved = new Promise<void>((resolve) => {
		resolvePrompt = resolve;
	});

	return {
		onAuth(callback) {
			onAuth = callback;
			return () => {
				onAuth = undefined;
			};
		},
		onProgress(callback) {
			onProgress = callback;
			return () => {
				onProgress = undefined;
			};
		},
		onPrompt(callback) {
			onPrompt = callback;
			return () => {
				onPrompt = undefined;
			};
		},
		respond: vi.fn(async () => {
			resolvePrompt();
		}),
		login: vi.fn(async () => {
			onProgress?.('Waiting for browser');
			onAuth?.({ url: 'https://example.com/auth' });
			onPrompt?.({ message: 'Enter code' });
			await promptResolved;
		}),
		dispose: vi.fn(async () => {}),
	};
}

describe('loginOAuth', () => {
	it('drives the auth flow resource and disposes it when finished', async () => {
		const flow = createFlow();
		const manager = {
			flow: vi.fn(async () => flow),
		} satisfies Pick<AppAuth, 'flow'>;
		const onAuth = vi.fn();
		const onProgress = vi.fn();
		const onPrompt = vi.fn(async () => '1234');

		await loginOAuth('anthropic', manager, {
			onAuth,
			onProgress,
			onPrompt,
		});

		expect(manager.flow).toHaveBeenCalledWith('anthropic');
		expect(flow.login).toHaveBeenCalledTimes(1);
		expect(onProgress).toHaveBeenCalledWith('Waiting for browser');
		expect(onAuth).toHaveBeenCalledWith({
			url: 'https://example.com/auth',
		});
		expect(onPrompt).toHaveBeenCalledWith({ message: 'Enter code' });
		expect(flow.respond).toHaveBeenCalledWith('1234');
		expect(flow.dispose).toHaveBeenCalledTimes(1);
	});
});
