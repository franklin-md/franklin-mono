// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { OAuthFlowState } from '@franklin/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AuthEntriesMock = {
	isOAuthSignedIn: (providerId: string) => boolean;
};

type OAuthFlowMock = {
	flowState: OAuthFlowState;
	login: () => Promise<void>;
	remove: () => void;
	dismiss: () => void;
};

const mocks = vi.hoisted(() => ({
	useAuthEntries: vi.fn<() => AuthEntriesMock>(),
	useOAuthFlow: vi.fn<() => OAuthFlowMock>(),
	login: vi.fn<() => Promise<void>>(),
	remove: vi.fn<() => void>(),
	dismiss: vi.fn<() => void>(),
}));

vi.mock('@franklin/react', () => ({
	Icons: {
		Claude: ({ className }: { className?: string }) => (
			<svg className={className} data-testid="claude-icon" />
		),
		OpenAI: ({ className }: { className?: string }) => (
			<svg className={className} data-testid="openai-icon" />
		),
	},
	useAuthEntries: mocks.useAuthEntries,
	useOAuthFlow: mocks.useOAuthFlow,
}));

import { ProviderRow } from '../../src/auth/settings-page/oauth/provider-row.js';

function setProviderState({
	flowState,
	isSignedIn = false,
}: {
	flowState: OAuthFlowState;
	isSignedIn?: boolean;
}) {
	mocks.useAuthEntries.mockReturnValue({
		isOAuthSignedIn: () => isSignedIn,
	});
	mocks.useOAuthFlow.mockReturnValue({
		flowState,
		login: mocks.login,
		remove: mocks.remove,
		dismiss: mocks.dismiss,
	});
}

describe('ProviderRow', () => {
	beforeEach(() => {
		setProviderState({ flowState: { phase: 'idle' } });
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('renders the OAuth flow progress below the provider controls', () => {
		setProviderState({
			flowState: {
				phase: 'in-progress',
				message: 'Opening provider authorization page',
			},
		});

		render(<ProviderRow provider={{ id: 'anthropic', name: 'Claude' }} />);

		expect(
			screen.getByText('Opening provider authorization page'),
		).toBeTruthy();
	});

	it('dismisses completed OAuth flow states', () => {
		setProviderState({ flowState: { phase: 'success' } });

		render(<ProviderRow provider={{ id: 'anthropic', name: 'Claude' }} />);
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

		expect(mocks.dismiss).toHaveBeenCalledTimes(1);
	});
});
