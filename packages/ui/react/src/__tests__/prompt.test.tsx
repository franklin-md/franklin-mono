import { afterEach, describe, it, expect, vi } from 'vitest';
import {
	cleanup,
	render,
	renderHook,
	screen,
	fireEvent,
	waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';

import { AgentProvider } from '../agent-context.js';
import { usePrompt } from '../prompt/context.js';
import { Prompt } from '../prompt/prompt.js';
import { PromptText } from '../prompt/text.js';
import { PromptSend } from '../prompt/send.js';
import { PromptControls } from '../prompt/controls.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRuntime(): {
	runtime: FranklinRuntime;
	promptSpy: ReturnType<typeof vi.fn>;
} {
	const promptSpy = vi.fn(async function* () {
		// yields nothing — simulates a completed turn
	});

	const runtime = {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: {},
			},
		})),
		setContext: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
		prompt: promptSpy,
	} as unknown as FranklinRuntime;

	return { runtime, promptSpy };
}

function TestHarness({
	runtime,
	children,
}: {
	runtime: FranklinRuntime;
	children: ReactNode;
}) {
	return (
		<AgentProvider agent={runtime}>
			<Prompt>{children}</Prompt>
		</AgentProvider>
	);
}

// ---------------------------------------------------------------------------
// PromptText
// ---------------------------------------------------------------------------

describe('PromptText', () => {
	it('merges value and onChange onto the child textarea', () => {
		const { runtime } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		const textarea = screen.getByTestId('input') as unknown as {
			value: string;
		};
		expect(textarea.value).toBe('');

		fireEvent.change(textarea, { target: { value: 'hello' } });
		expect(textarea.value).toBe('hello');
	});

	it('sends on Enter and clears input', async () => {
		const { runtime, promptSpy } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		const textarea = screen.getByTestId('input') as unknown as {
			value: string;
		};
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		await waitFor(() => {
			expect(promptSpy).toHaveBeenCalledWith({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
		});

		// Input should be cleared after send
		expect(textarea.value).toBe('');
	});

	it('does NOT send on Shift+Enter', () => {
		const { runtime, promptSpy } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		const textarea = screen.getByTestId('input');
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

		expect(promptSpy).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// PromptSend
// ---------------------------------------------------------------------------

describe('PromptSend', () => {
	it('is disabled when input is empty', () => {
		const { runtime } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
				<PromptSend>
					<button data-testid="send">Send</button>
				</PromptSend>
			</TestHarness>,
		);

		const btn = screen.getByTestId('send') as unknown as { disabled: boolean };
		expect(btn.disabled).toBe(true);
	});

	it('is enabled when input has text', () => {
		const { runtime } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
				<PromptSend>
					<button data-testid="send">Send</button>
				</PromptSend>
			</TestHarness>,
		);

		fireEvent.change(screen.getByTestId('input'), {
			target: { value: 'hello' },
		});

		const btn = screen.getByTestId('send') as unknown as { disabled: boolean };
		expect(btn.disabled).toBe(false);
	});

	it('triggers send on click', async () => {
		const { runtime, promptSpy } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
				<PromptSend>
					<button data-testid="send">Send</button>
				</PromptSend>
			</TestHarness>,
		);

		fireEvent.change(screen.getByTestId('input'), {
			target: { value: 'hello' },
		});
		fireEvent.click(screen.getByTestId('send'));

		await waitFor(() => {
			expect(promptSpy).toHaveBeenCalledWith({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
		});
	});
});

// ---------------------------------------------------------------------------
// PromptControls
// ---------------------------------------------------------------------------

describe('PromptControls', () => {
	it('renders its child as a passthrough', () => {
		const { runtime } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptControls>
					<div data-testid="controls">Controls here</div>
				</PromptControls>
			</TestHarness>,
		);

		const el = screen.getByTestId('controls');
		expect(el).toBeTruthy();
		expect((el as unknown as { textContent: string }).textContent).toBe(
			'Controls here',
		);
	});
});

// ---------------------------------------------------------------------------
// usePrompt — escape hatch
// ---------------------------------------------------------------------------

describe('usePrompt', () => {
	it('throws when used outside <Prompt>', () => {
		expect(() => {
			renderHook(() => usePrompt());
		}).toThrow('usePrompt must be used inside a <PromptProvider>');
	});
});
