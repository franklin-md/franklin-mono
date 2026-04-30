// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type * as FranklinReact from '@franklin/react';
import type { OAuthLoginState } from '@franklin/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AuthEntriesMock = {
	isOAuthSignedIn: (providerId: string) => boolean;
};

type OAuthLoginMock = {
	state: OAuthLoginState;
	handleLogin: () => Promise<void>;
	remove: () => void;
	reset: () => void;
};

const mocks = vi.hoisted(() => ({
	useAuthEntries: vi.fn<() => AuthEntriesMock>(),
	useOAuthLogin: vi.fn<() => OAuthLoginMock>(),
	handleLogin: vi.fn<() => Promise<void>>(),
	remove: vi.fn<() => void>(),
	reset: vi.fn<() => void>(),
}));

vi.mock('@franklin/react', async (importOriginal) => {
	const actual = await importOriginal<typeof FranklinReact>();

	return {
		...actual,
		Icons: {
			Claude: ({ className }: { className?: string }) => (
				<svg className={className} data-testid="claude-icon" />
			),
			OpenAI: ({ className }: { className?: string }) => (
				<svg className={className} data-testid="openai-icon" />
			),
		},
		useAuthEntries: mocks.useAuthEntries,
		useOAuthLogin: mocks.useOAuthLogin,
	};
});

import { AuthActionProvider } from '@franklin/react';
import { ProviderRow } from '../../src/auth/settings-page/oauth/provider-row.js';

function setProviderState({
	state,
	isSignedIn = false,
}: {
	state: OAuthLoginState;
	isSignedIn?: boolean;
}) {
	mocks.useAuthEntries.mockReturnValue({
		isOAuthSignedIn: () => isSignedIn,
	});
	mocks.useOAuthLogin.mockReturnValue({
		state,
		handleLogin: mocks.handleLogin,
		remove: mocks.remove,
		reset: mocks.reset,
	});
}

describe('ProviderRow', () => {
	beforeEach(() => {
		setProviderState({ state: { phase: 'idle' } });
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('renders the OAuth flow progress below the provider controls', () => {
		setProviderState({
			state: {
				phase: 'in-progress',
				message: 'Opening provider authorization page',
			},
		});

		render(
			<AuthActionProvider handlers={{ requestApiKey: vi.fn() }}>
				<ProviderRow provider={{ id: 'anthropic', name: 'Claude' }} />
			</AuthActionProvider>,
		);

		expect(
			screen.getByText('Opening provider authorization page'),
		).toBeTruthy();
	});

	it('dismisses completed OAuth login states', () => {
		setProviderState({ state: { phase: 'success' } });

		render(
			<AuthActionProvider handlers={{ requestApiKey: vi.fn() }}>
				<ProviderRow provider={{ id: 'anthropic', name: 'Claude' }} />
			</AuthActionProvider>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

		expect(mocks.reset).toHaveBeenCalledTimes(1);
	});

});
