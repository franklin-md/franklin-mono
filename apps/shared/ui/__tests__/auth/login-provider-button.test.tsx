// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	AnthropicLoginButton,
	OpenAICodexLoginButton,
} from '../../src/index.js';

describe('LoginProviderButton', () => {
	afterEach(() => {
		cleanup();
	});

	it('shows a sign-in label by default', () => {
		render(<AnthropicLoginButton />);
		expect(screen.getByRole('button').textContent).toContain('Sign in');
	});

	it('shows a signed-in label when isSignedIn', () => {
		render(<AnthropicLoginButton isSignedIn />);
		expect(screen.getByRole('button').textContent).toContain('Logged in');
	});

	it('disables and sets aria-busy when loading', () => {
		const onClick = vi.fn();
		render(<AnthropicLoginButton isLoading onClick={onClick} />);

		const button = screen.getByRole('button');
		fireEvent.click(button);

		expect(button.getAttribute('aria-busy')).toBe('true');
		expect(button.hasAttribute('disabled')).toBe(true);
		expect(onClick).not.toHaveBeenCalled();
	});

	it('calls onClick', () => {
		const onClick = vi.fn();
		render(<AnthropicLoginButton onClick={onClick} />);

		fireEvent.click(screen.getByRole('button'));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('renders both Anthropic and OpenAI Codex wrappers', () => {
		render(
			<>
				<AnthropicLoginButton data-testid="anthropic" />
				<OpenAICodexLoginButton data-testid="codex" />
			</>,
		);

		expect(screen.getByTestId('anthropic')).toBeTruthy();
		expect(screen.getByTestId('codex')).toBeTruthy();
	});
});
