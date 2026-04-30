// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthLoginCallbacks,
} from '@franklin/agent/browser';
import { AppContext, AuthActionProvider } from '@franklin/react';

import { DefaultAuthActionProvider } from '../../src/auth/default-action-provider.js';
import { Command } from '../../src/primitives/command.js';
import { ProviderAuthAction } from '../../src/conversation/input/model-selector/auth-shortcut/index.js';
import { ProviderSection } from '../../src/conversation/input/model-selector/section.js';

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
			<AppContext.Provider value={app as never}>
				<AuthActionProvider handlers={{ requestApiKey: vi.fn() }}>
					{ui}
				</AuthActionProvider>
			</AppContext.Provider>,
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

afterEach(() => {
	cleanup();
});

describe('ProviderAuthAction', () => {
	beforeEach(() => {
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: vi.fn(),
		});
	});

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

	it('opens the API key dialog for unsigned API providers (default handler)', async () => {
		renderWithAuth(
			<DefaultAuthActionProvider>
				<ProviderAuthAction
					access="api"
					displayName="OpenRouter"
					provider="openrouter"
				/>
			</DefaultAuthActionProvider>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Add API key for OpenRouter' }),
		);

		expect(await screen.findByText('Add API Key')).toBeTruthy();
	});

	it('uses the host API key action when one is provided', () => {
		const requestApiKey = vi.fn();

		renderWithAuth(
			<AuthActionProvider handlers={{ requestApiKey }}>
				<ProviderAuthAction
					access="api"
					displayName="OpenRouter"
					provider="openrouter"
				/>
			</AuthActionProvider>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Add API key for OpenRouter' }),
		);

		expect(requestApiKey).toHaveBeenCalledWith({
			provider: 'openrouter',
			displayName: 'OpenRouter',
		});
		expect(screen.queryByText('Add API Key')).toBeNull();
	});

	it('keeps provider section auth actions outside aria-hidden headings', () => {
		renderWithAuth(
			<Command>
				<ProviderSection
					group={{
						provider: 'openrouter',
						displayName: 'OpenRouter',
						access: 'api',
						models: [
							{
								id: 'z-ai/glm-5.1',
								provider: 'openrouter',
								name: 'GLM 5.1',
								reasoning: true,
								contextWindow: 202_752,
								costInput: 1.26,
								costOutput: 3.96,
								intelligence: 'frontier',
							},
						],
					}}
					selectedModel="z-ai/glm-5.1"
					selectedProvider="openrouter"
					onSelect={vi.fn()}
				/>
			</Command>,
		);

		const button = screen.getByRole('button', {
			name: 'Add API key for OpenRouter',
		});

		expect(button.closest('[aria-hidden="true"]')).toBeNull();
	});
});
