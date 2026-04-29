// @vitest-environment jsdom

import type { AuthEntries, FranklinApp } from '@franklin/agent/browser';
import { AppContext } from '@franklin/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '../page.js';

afterEach(() => {
	cleanup();
});

type AuthStub = {
	entries: () => AuthEntries;
	setApiKeyEntry: ReturnType<typeof vi.fn>;
	removeApiKeyEntry: ReturnType<typeof vi.fn>;
	getApiKeyProviders: () => Promise<string[]>;
	getOAuthProviders: () => { id: string; name: string }[];
	onAuthChange: () => () => void;
	cancel: () => Promise<void>;
};

function createAuthStub(initial: AuthEntries = {}): AuthStub {
	let entries = initial;
	return {
		entries: () => entries,
		setApiKeyEntry: vi.fn((provider: string, entry) => {
			entries = { ...entries, [provider]: { apiKey: entry } };
		}),
		removeApiKeyEntry: vi.fn((provider: string) => {
			const { [provider]: _removed, ...rest } = entries;
			entries = rest;
		}),
		getApiKeyProviders: async () => ['openrouter'],
		getOAuthProviders: () => [{ id: 'openai-codex', name: 'ChatGPT' }],
		onAuthChange: () => () => {},
		cancel: async () => {},
	};
}

function renderPage(auth: AuthStub) {
	const openExternal = vi.fn(async () => {});
	const app = {
		auth,
		platform: {
			os: { openExternal },
		},
	} as unknown as FranklinApp;

	return {
		...render(
			<AppContext.Provider value={app}>
				<SettingsPage />
			</AppContext.Provider>,
		),
		openExternal,
	};
}

describe('SettingsPage', () => {
	it('seeds the OpenRouter input from the existing auth entry', () => {
		const auth = createAuthStub({
			openrouter: { apiKey: { type: 'apiKey', key: 'sk-or-existing' } },
		});

		renderPage(auth);

		const input = screen.getByLabelText<HTMLInputElement>('OpenRouter API key');
		expect(input.value).toBe('sk-or-existing');
	});

	it('links to OpenRouter API key settings', () => {
		const auth = createAuthStub();
		const { openExternal } = renderPage(auth);

		const link = screen.getByRole('link', {
			name: 'OpenRouter API keys',
		});
		expect(link.getAttribute('href')).toBe(
			'https://openrouter.ai/settings/keys',
		);
		expect(link.getAttribute('target')).toBe('_blank');

		fireEvent.click(link);
		expect(openExternal).toHaveBeenCalledWith(
			'https://openrouter.ai/settings/keys',
		);
	});

	it('writes the OpenRouter key into the auth manager on change', () => {
		const auth = createAuthStub();
		renderPage(auth);

		const input = screen.getByLabelText('OpenRouter API key');
		fireEvent.change(input, { target: { value: '  sk-or-new  ' } });

		expect(auth.setApiKeyEntry).toHaveBeenCalledWith('openrouter', {
			type: 'apiKey',
			key: 'sk-or-new',
		});
	});

	it('clears the OpenRouter entry when the input is emptied', () => {
		const auth = createAuthStub({
			openrouter: { apiKey: { type: 'apiKey', key: 'sk-or-existing' } },
		});
		renderPage(auth);

		const input = screen.getByLabelText('OpenRouter API key');
		fireEvent.change(input, { target: { value: '   ' } });

		expect(auth.removeApiKeyEntry).toHaveBeenCalledWith('openrouter');
	});

	it('renders a ChatGPT login button', () => {
		const auth = createAuthStub();
		renderPage(auth);

		expect(screen.getByRole('button', { name: /chatgpt/i })).toBeTruthy();
	});
});
