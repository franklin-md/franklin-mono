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

import { AgentProvider } from '../agent/agent-context.js';
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
	cancelSpy: ReturnType<typeof vi.fn>;
} {
	const promptSpy = vi.fn(async function* () {
		// yields nothing — simulates a completed turn
	});

	const cancelSpy = vi.fn(async () => {});

	const runtime = {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: {},
			},
		})),
		subscribe: vi.fn(() => () => {}),
		prompt: promptSpy,
		cancel: cancelSpy,
	} as unknown as FranklinRuntime;

	return { runtime, promptSpy, cancelSpy };
}

/**
 * Creates a mock runtime whose prompt generator stays open until
 * `resolve()` is called, keeping `sending === true` for the test duration.
 */
function makePendingRuntime(): {
	runtime: FranklinRuntime;
	cancelSpy: ReturnType<typeof vi.fn>;
	resolve: () => void;
} {
	let resolve!: () => void;
	const pending = new Promise<void>((r) => {
		resolve = r;
	});

	const cancelSpy = vi.fn(async () => {});

	const runtime = {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: {},
			},
		})),
		subscribe: vi.fn(() => () => {}),
		// eslint-disable-next-line require-yield -- intentionally hangs to keep sending=true
		prompt: vi.fn(async function* () {
			await pending;
		}),
		cancel: cancelSpy,
	} as unknown as FranklinRuntime;

	return { runtime, cancelSpy, resolve };
}

/**
 * Returns a mock runtime whose prompt hangs until `complete()` is called,
 * keeping the prompt in the `sending` state for the duration.
 */
function makeHangingRuntime(): {
	runtime: FranklinRuntime;
	promptSpy: ReturnType<typeof vi.fn>;
	complete: () => void;
} {
	let resolve!: () => void;
	const gate = new Promise<void>((r) => {
		resolve = r;
	});

	// eslint-disable-next-line require-yield
	const promptSpy = vi.fn(async function* () {
		await gate;
	});

	const runtime = {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: {},
			},
		})),
		subscribe: vi.fn(() => () => {}),
		prompt: promptSpy,
	} as unknown as FranklinRuntime;

	return { runtime, promptSpy, complete: resolve };
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

		const textarea = screen.getByTestId('input');
		if (!(textarea instanceof HTMLTextAreaElement)) {
			throw new TypeError('Expected a textarea');
		}
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

		const textarea = screen.getByTestId('input');
		if (!(textarea instanceof HTMLTextAreaElement)) {
			throw new TypeError('Expected a textarea');
		}
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
// Behavior during an active turn (sending === true)
// ---------------------------------------------------------------------------

describe('during active turn', () => {
	it('textarea is not disabled while sending', async () => {
		const { runtime, complete } = makeHangingRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		const textarea = screen.getByTestId('input');
		if (!(textarea instanceof HTMLTextAreaElement)) {
			throw new TypeError('Expected a textarea');
		}

		// Send a message to enter the sending state
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		await waitFor(() => {
			expect(textarea.disabled).toBe(false);
		});

		complete();
	});

	it('allows typing while sending', async () => {
		const { runtime, complete } = makeHangingRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		const textarea = screen.getByTestId('input');
		if (!(textarea instanceof HTMLTextAreaElement)) {
			throw new TypeError('Expected a textarea');
		}

		// Trigger a send
		fireEvent.change(textarea, { target: { value: 'first' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		// Type while the agent is processing
		fireEvent.change(textarea, { target: { value: 'next message' } });

		await waitFor(() => {
			expect(textarea.value).toBe('next message');
		});

		complete();
	});

	it('Enter does not submit while sending', async () => {
		const { runtime, promptSpy, complete } = makeHangingRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		const textarea = screen.getByTestId('input');
		if (!(textarea instanceof HTMLTextAreaElement)) {
			throw new TypeError('Expected a textarea');
		}

		// Trigger a send
		fireEvent.change(textarea, { target: { value: 'first' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		await waitFor(() => {
			expect(promptSpy).toHaveBeenCalledTimes(1);
		});

		// Type a new message and press Enter while still sending
		fireEvent.change(textarea, { target: { value: 'second' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		// Should not have fired a second prompt
		expect(promptSpy).toHaveBeenCalledTimes(1);
		// Input should be preserved (not cleared by a send)
		expect(textarea.value).toBe('second');

		complete();
	});

	it('send button is disabled while sending', async () => {
		const { runtime, complete } = makeHangingRuntime();

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

		const textarea = screen.getByTestId('input');
		const btn = screen.getByTestId('send');
		if (!(btn instanceof HTMLButtonElement)) {
			throw new TypeError('Expected a button');
		}

		// Trigger a send
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		await waitFor(() => {
			expect(btn.disabled).toBe(true);
		});

		complete();
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

		const btn = screen.getByTestId('send');
		if (!(btn instanceof HTMLButtonElement)) {
			throw new TypeError('Expected a button');
		}
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

		const btn = screen.getByTestId('send');
		if (!(btn instanceof HTMLButtonElement)) {
			throw new TypeError('Expected a button');
		}
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
// ESC-to-cancel
// ---------------------------------------------------------------------------

describe('ESC-to-cancel', () => {
	it('calls cancel when Escape is pressed during a turn', async () => {
		const { runtime, cancelSpy, resolve } = makePendingRuntime();

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

		// Type and send to enter the sending state
		fireEvent.change(screen.getByTestId('input'), {
			target: { value: 'hello' },
		});
		fireEvent.click(screen.getByTestId('send'));

		// Wait for sending state to be active (button becomes disabled)
		await waitFor(() => {
			const btn = screen.getByTestId('send');
			expect((btn as HTMLButtonElement).disabled).toBe(true);
		});

		// Press Escape on the textarea
		fireEvent.keyDown(screen.getByTestId('input'), { key: 'Escape' });

		expect(cancelSpy).toHaveBeenCalledOnce();

		// Clean up the pending promise
		resolve();
	});

	it('does NOT call cancel when Escape is pressed while idle', () => {
		const { runtime, cancelSpy } = makeMockRuntime();

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		fireEvent.keyDown(screen.getByTestId('input'), { key: 'Escape' });

		expect(cancelSpy).not.toHaveBeenCalled();
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
