import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';

import type { PromptContextValue } from '../context.js';
import { PromptProvider } from '../context.js';
import { PromptAgentControl } from '../agent-control.js';

afterEach(cleanup);

function renderWithContext(ctx: PromptContextValue, ui: React.ReactElement) {
	return render(<PromptProvider value={ctx}>{ui}</PromptProvider>);
}

function makeContext(
	overrides: Partial<PromptContextValue> = {},
): PromptContextValue {
	return {
		input: '',
		setInput: vi.fn(),
		sending: false,
		canSend: true,
		send: vi.fn(),
		cancel: vi.fn(),
		...overrides,
	};
}

describe('PromptAgentControl', () => {
	it('renders the send element when not sending', () => {
		renderWithContext(
			makeContext({ sending: false }),
			<PromptAgentControl
				send={<button data-testid="send">Enter</button>}
				cancel={<button data-testid="cancel">Stop</button>}
			/>,
		);

		expect(screen.queryByTestId('send')).toBeTruthy();
		expect(screen.queryByTestId('cancel')).toBeNull();
	});

	it('renders the cancel element when sending', () => {
		renderWithContext(
			makeContext({ sending: true }),
			<PromptAgentControl
				send={<button data-testid="send">Enter</button>}
				cancel={<button data-testid="cancel">Stop</button>}
			/>,
		);

		expect(screen.queryByTestId('cancel')).toBeTruthy();
		expect(screen.queryByTestId('send')).toBeNull();
	});

	it('disables the send element when canSend is false', () => {
		renderWithContext(
			makeContext({ sending: false, canSend: false }),
			<PromptAgentControl
				send={<button data-testid="send">Enter</button>}
				cancel={<button data-testid="cancel">Stop</button>}
			/>,
		);

		const btn = screen.getByTestId('send');
		if (!(btn instanceof HTMLButtonElement)) {
			throw new TypeError('Expected a button');
		}
		expect(btn.disabled).toBe(true);
	});

	it('enables the send element when canSend is true', () => {
		renderWithContext(
			makeContext({ sending: false, canSend: true }),
			<PromptAgentControl
				send={<button data-testid="send">Enter</button>}
				cancel={<button data-testid="cancel">Stop</button>}
			/>,
		);

		const btn = screen.getByTestId('send');
		if (!(btn instanceof HTMLButtonElement)) {
			throw new TypeError('Expected a button');
		}
		expect(btn.disabled).toBe(false);
	});

	it('calls send when the send element is clicked', () => {
		const send = vi.fn();
		renderWithContext(
			makeContext({ send }),
			<PromptAgentControl
				send={<button data-testid="send">Enter</button>}
				cancel={<button data-testid="cancel">Stop</button>}
			/>,
		);

		fireEvent.click(screen.getByTestId('send'));
		expect(send).toHaveBeenCalledOnce();
	});

	it('calls cancel when the cancel element is clicked', () => {
		const cancel = vi.fn();
		renderWithContext(
			makeContext({ sending: true, cancel }),
			<PromptAgentControl
				send={<button data-testid="send">Enter</button>}
				cancel={<button data-testid="cancel">Stop</button>}
			/>,
		);

		fireEvent.click(screen.getByTestId('cancel'));
		expect(cancel).toHaveBeenCalledOnce();
	});
});
