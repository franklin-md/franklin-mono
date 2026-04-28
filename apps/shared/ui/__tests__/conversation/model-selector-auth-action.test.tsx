// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthLoginCallbacks,
} from '@franklin/agent/browser';
import { AppContext } from '@franklin/react';

import { ProviderAuthAction } from '../../src/conversation/input/model-selector/auth-shortcut/index.js';

function renderWithAuth(ui: ReactElement, opts?: { entries?: AuthEntries }) {
	const auth = createAuthMock(opts?.entries ?? {});
	const openExternal = vi.fn();
	const app = {
		auth,
		platform: {
			os: {
				openExternal,
			},
		},
	};

	return {
		auth,
		openExternal,
		...render(
			<AppContext.Provider value={app as never}>{ui}</AppContext.Provider>,
		),
	};
}

function createAuthMock(initialEntries: AuthEntries) {
	let entries = initialEntries;
	const listeners = new Set<
		(provider: string, entry: AuthEntry | undefined) => void
	>();

	function notify(provider: string) {
		for (const listener of listeners) {
			listener(provider, entries[provider]);
		}
	}

	return {
		entries: () => entries,
		onAuthChange: (
			listener: (provider: string, entry: AuthEntry | undefined) => void,
		) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getOAuthProviders: () => [
			{ id: 'anthropic', name: 'Anthropic' },
			{ id: 'openai-codex', name: 'ChatGPT' },
		],
		getApiKeyProviders: async () => ['openrouter'],
		loginOAuth: vi.fn(
			async (provider: string, callbacks: OAuthLoginCallbacks) => {
				callbacks.onAuth({ url: 'https://example.com/auth' });
				entries = {
					...entries,
					[provider]: {
						...(entries[provider] ?? {}),
						oauth: {
							type: 'oauth',
							credentials: {
								access: 'access',
								refresh: 'refresh',
								expires: Date.now() + 60_000,
							},
						},
					},
				};
				notify(provider);
			},
		),
		cancel: vi.fn(async () => {}),
		removeOAuthEntry: vi.fn(),
		setApiKeyEntry: vi.fn((provider: string, apiKey: ApiKeyEntry) => {
			entries = {
				...entries,
				[provider]: {
					...(entries[provider] ?? {}),
					apiKey,
				},
			};
			notify(provider);
		}),
		removeApiKeyEntry: vi.fn(),
	};
}

describe('ProviderAuthAction', () => {
	it('renders signed-in providers as non-button status', () => {
		renderWithAuth(
			<ProviderAuthAction
				access="api"
				displayName="OpenRouter"
				provider="openrouter"
			/>,
			{
				entries: {
					openrouter: {
						apiKey: { type: 'apiKey', key: 'sk-test' },
					},
				},
			},
		);

		expect(screen.getByLabelText('Signed in to OpenRouter')).toBeTruthy();
		expect(
			screen.queryByRole('button', { name: 'Add API key for OpenRouter' }),
		).toBeNull();
	});

	it('starts the OAuth flow for unsigned OAuth providers', async () => {
		const { auth, openExternal } = renderWithAuth(
			<ProviderAuthAction
				access="api"
				displayName="Anthropic"
				provider="anthropic"
			/>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Sign in to Anthropic' }),
		);

		await waitFor(() => {
			expect(auth.loginOAuth).toHaveBeenCalledWith(
				'anthropic',
				expect.any(Object),
			);
		});
		expect(openExternal).toHaveBeenCalledWith('https://example.com/auth');
	});

	it('opens the API key dialog for unsigned API providers', async () => {
		renderWithAuth(
			<ProviderAuthAction
				access="api"
				displayName="OpenRouter"
				provider="openrouter"
			/>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Add API key for OpenRouter' }),
		);

		expect(await screen.findByText('Add API Key')).toBeTruthy();
	});
});
