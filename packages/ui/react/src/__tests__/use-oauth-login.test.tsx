import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { OAuthLoginCallbacks } from '@franklin/agent/browser';

import { AppContext } from '../agent/franklin-context.js';
import { useOAuthLogin } from '../auth/use-oauth-login.js';

function makeWrapper(auth: {
	loginOAuth: (
		provider: string,
		callbacks: OAuthLoginCallbacks,
	) => Promise<void>;
	cancel?: (provider: string) => Promise<void>;
	removeOAuthEntry?: (provider: string) => void;
}) {
	const app = {
		auth,
		platform: {
			os: {
				openExternal: vi.fn(),
			},
		},
	};

	return {
		app,
		Wrapper: ({ children }: { children: ReactNode }) => {
			return (
				<AppContext.Provider value={app as never}>
					{children}
				</AppContext.Provider>
			);
		},
	};
}

describe('useOAuthLogin', () => {
	it('runs the provider login flow and opens the auth URL', async () => {
		const auth = {
			loginOAuth: vi.fn(
				async (_provider: string, callbacks: OAuthLoginCallbacks) => {
					callbacks.onAuth({ url: 'https://example.com/auth' });
				},
			),
		};
		const { app, Wrapper } = makeWrapper(auth);
		const { result } = renderHook(() => useOAuthLogin('anthropic'), {
			wrapper: Wrapper,
		});

		await act(async () => {
			await result.current.handleLogin();
		});

		expect(auth.loginOAuth).toHaveBeenCalledWith(
			'anthropic',
			expect.any(Object),
		);
		expect(app.platform.os.openExternal).toHaveBeenCalledWith(
			'https://example.com/auth',
		);
		expect(result.current.state).toEqual({ phase: 'success' });
		expect(result.current.pending).toBe(false);
	});

	it('reports pending while the login flow is active', async () => {
		let finish!: () => void;
		let loginPromise!: Promise<void>;
		const auth = {
			loginOAuth: vi.fn((_provider: string, callbacks: OAuthLoginCallbacks) => {
				callbacks.onAuth({ url: 'https://example.com/auth' });
				loginPromise = new Promise<void>((resolve) => {
					finish = resolve;
				});
				return loginPromise;
			}),
		};
		const { Wrapper } = makeWrapper(auth);
		const { result } = renderHook(() => useOAuthLogin('anthropic'), {
			wrapper: Wrapper,
		});

		act(() => {
			void result.current.handleLogin();
		});

		await waitFor(() => {
			expect(result.current.pending).toBe(true);
		});

		await act(async () => {
			finish();
			await loginPromise;
		});

		expect(result.current.state).toEqual({ phase: 'success' });
		expect(result.current.pending).toBe(false);
	});

	it('cancels an active login flow when the hook unmounts', async () => {
		const cancel = vi.fn(async () => {});
		const auth = {
			loginOAuth: vi.fn(() => new Promise<void>(() => {})),
			cancel,
			removeOAuthEntry: vi.fn(),
		};
		const { Wrapper } = makeWrapper(auth);
		const { result, unmount } = renderHook(() => useOAuthLogin('anthropic'), {
			wrapper: Wrapper,
		});

		act(() => {
			void result.current.handleLogin();
		});

		await waitFor(() => {
			expect(result.current.pending).toBe(true);
		});

		unmount();

		expect(cancel).toHaveBeenCalledWith('anthropic');
	});
});
