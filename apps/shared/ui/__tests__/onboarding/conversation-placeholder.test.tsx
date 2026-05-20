// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bindHostAction, openExternalAction } from '@franklin/react';

import { ApplicationProvider } from '../../src/application-context.js';
import { ConversationOnboardingPlaceholder } from '../../src/onboarding/conversation-placeholder.js';

function renderWithAuth(entries: Record<string, unknown> = {}) {
	const loginOAuth = vi.fn(async () => {});
	const app = {
		auth: {
			cancel: vi.fn(async () => {}),
			entries: () => entries,
			loginOAuth,
			onAuthChange: () => () => {},
			removeOAuthEntry: vi.fn(),
		},
	};

	render(
		<ApplicationProvider
			harness={app as never}
			hostActionBindings={[bindHostAction(openExternalAction, vi.fn())]}
		>
			<ConversationOnboardingPlaceholder />
		</ApplicationProvider>,
	);

	return { loginOAuth };
}

describe('ConversationOnboardingPlaceholder', () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('renders the ChatGPT quick start when no providers are configured', () => {
		renderWithAuth();

		expect(screen.getByText('Welcome to Franklin!')).toBeTruthy();
		expect(
			screen.getByRole('button', { name: /Login with ChatGPT/ }),
		).toBeTruthy();
	});

	it('starts the OpenAI Codex OAuth flow from the login button', async () => {
		const { loginOAuth } = renderWithAuth();

		fireEvent.click(screen.getByRole('button', { name: /Login with ChatGPT/ }));

		await waitFor(() =>
			expect(loginOAuth).toHaveBeenCalledWith(
				'openai-codex',
				expect.objectContaining({
					onAuth: expect.any(Function),
					onProgress: expect.any(Function),
				}),
			),
		);
	});

	it('keeps the plain empty state when a provider is configured', () => {
		renderWithAuth({
			anthropic: { apiKey: { type: 'apiKey', key: 'test-key' } },
		});

		expect(
			screen.getByText('Send a message to start the conversation.'),
		).toBeTruthy();
		expect(screen.queryByText('Welcome to Franklin!')).toBeNull();
	});
});
