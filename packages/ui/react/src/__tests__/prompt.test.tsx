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

import type {
	ConversationTurn,
	Store,
	TurnEndBlock,
} from '@franklin/extensions';
import { conversationExtension, createStore } from '@franklin/extensions';
import type { UserMessage } from '@franklin/mini-acp';
import type { FranklinRuntime } from '@franklin/agent/browser';

import { AgentProvider } from '../agent/agent-context.js';
import { usePrompt } from '../prompt/context.js';
import { Prompt } from '../prompt/prompt.js';
import { PromptText } from '../prompt/text.js';
import { PromptSend } from '../prompt/send.js';
import { PromptAgentControl } from '../prompt/agent-control.js';
import { PromptControls } from '../prompt/controls.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const conversationKey = conversationExtension.keys.conversation;
const finishedStopCode = 1000 as TurnEndBlock['stopCode'];

// Mirrors what the real conversation extension does on the `prompt` event:
// pushes a fresh in-progress turn so `phase === 'in-progress'` derivation works.
function pushPromptTurn(
	store: Store<ConversationTurn[]>,
	prompt: UserMessage,
): void {
	store.set((draft) => {
		draft.push({
			id: `turn-${draft.length}`,
			timestamp: 0,
			prompt,
			response: { blocks: [] },
		});
	});
}

// Mirrors `handleTurnEnd`: appends a terminal turnEnd block to the last turn,
// flipping its phase to `complete`. Idempotent so cancel-then-resolve is safe.
function appendTurnEnd(store: Store<ConversationTurn[]>): void {
	store.set((draft) => {
		const turn = draft.at(-1);
		if (!turn) return;
		if (turn.response.blocks.at(-1)?.kind === 'turnEnd') return;
		turn.response.blocks.push({
			kind: 'turnEnd',
			stopCode: finishedStopCode,
			startedAt: 0,
			endedAt: 0,
		});
	});
}

function buildRuntime(
	store: Store<ConversationTurn[]>,
	promptSpy: ReturnType<typeof vi.fn>,
	cancelSpy: ReturnType<typeof vi.fn>,
): FranklinRuntime {
	return {
		state: {
			get: vi.fn(async () => ({
				core: {
					messages: [],
					llmConfig: {},
				},
			})),
		},
		subscribe: vi.fn(() => () => {}),
		prompt: promptSpy,
		cancel: cancelSpy,
		getStore: (name: string) => {
			if (name === conversationKey) return store;
			throw new Error(`No store named "${name}"`);
		},
	} as unknown as FranklinRuntime;
}

function makeMockRuntime(initialTurns: ConversationTurn[] = []): {
	runtime: FranklinRuntime;
	promptSpy: ReturnType<typeof vi.fn>;
	cancelSpy: ReturnType<typeof vi.fn>;
	store: Store<ConversationTurn[]>;
} {
	const store = createStore(initialTurns);

	// eslint-disable-next-line require-yield -- generator drives store updates only
	const promptSpy = vi.fn(async function* (request: UserMessage) {
		pushPromptTurn(store, request);
		appendTurnEnd(store);
	});

	const cancelSpy = vi.fn(async () => {
		appendTurnEnd(store);
	});

	return {
		runtime: buildRuntime(store, promptSpy, cancelSpy),
		promptSpy,
		cancelSpy,
		store,
	};
}

/**
 * Creates a mock runtime whose prompt generator stays open until
 * `resolve()` is called, keeping the in-progress turn alive in the store.
 */
function makePendingRuntime(): {
	runtime: FranklinRuntime;
	cancelSpy: ReturnType<typeof vi.fn>;
	resolve: () => void;
} {
	const store = createStore<ConversationTurn[]>([]);
	let resolve!: () => void;
	const pending = new Promise<void>((r) => {
		resolve = r;
	});

	// eslint-disable-next-line require-yield -- intentionally hangs to keep the turn in-progress
	const promptSpy = vi.fn(async function* (request: UserMessage) {
		pushPromptTurn(store, request);
		await pending;
		appendTurnEnd(store);
	});

	const cancelSpy = vi.fn(async () => {
		appendTurnEnd(store);
	});

	return {
		runtime: buildRuntime(store, promptSpy, cancelSpy),
		cancelSpy,
		resolve,
	};
}

/**
 * Returns a mock runtime whose prompt hangs until `complete()` is called,
 * keeping the in-progress turn in the conversation store for the duration.
 */
function makeHangingRuntime(): {
	runtime: FranklinRuntime;
	promptSpy: ReturnType<typeof vi.fn>;
	complete: () => void;
} {
	const store = createStore<ConversationTurn[]>([]);
	let resolve!: () => void;
	const gate = new Promise<void>((r) => {
		resolve = r;
	});

	// eslint-disable-next-line require-yield -- intentionally hangs to keep the turn in-progress
	const promptSpy = vi.fn(async function* (request: UserMessage) {
		pushPromptTurn(store, request);
		await gate;
		appendTurnEnd(store);
	});

	const cancelSpy = vi.fn(async () => {
		appendTurnEnd(store);
	});

	return {
		runtime: buildRuntime(store, promptSpy, cancelSpy),
		promptSpy,
		complete: resolve,
	};
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
// sending derives from conversation store
//
// Models the "switch away mid-turn, switch back" scenario: when Prompt mounts
// against a session whose conversation store already holds an in-progress
// turn (no terminal turnEnd block), it must derive sending=true without any
// prior call to send() in this component instance.
// ---------------------------------------------------------------------------

function inProgressTurn(): ConversationTurn {
	return {
		id: 'turn-mid-flight',
		timestamp: 0,
		prompt: { role: 'user', content: [{ type: 'text', text: 'mid-flight' }] },
		response: { blocks: [{ kind: 'text', text: 'streaming…', startedAt: 0 }] },
	};
}

describe('sending derives from conversation store', () => {
	it('renders the cancel control when the store has an in-progress turn on mount', () => {
		const { runtime } = makeMockRuntime([inProgressTurn()]);

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
				<PromptAgentControl
					send={<button data-testid="send">Send</button>}
					cancel={<button data-testid="cancel">Stop</button>}
				/>
			</TestHarness>,
		);

		expect(screen.queryByTestId('cancel')).toBeTruthy();
		expect(screen.queryByTestId('send')).toBeNull();
	});

	it('routes ESC to cancel when the store has an in-progress turn on mount', () => {
		const { runtime, cancelSpy } = makeMockRuntime([inProgressTurn()]);

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
			</TestHarness>,
		);

		fireEvent.keyDown(screen.getByTestId('input'), { key: 'Escape' });

		expect(cancelSpy).toHaveBeenCalledOnce();
	});

	it('renders the send control when the store has only completed turns', () => {
		const completedTurn: ConversationTurn = {
			id: 'turn-done',
			timestamp: 0,
			prompt: { role: 'user', content: [{ type: 'text', text: 'hi' }] },
			response: {
				blocks: [
					{ kind: 'text', text: 'done', startedAt: 0, endedAt: 0 },
					{
						kind: 'turnEnd',
						stopCode: finishedStopCode,
						startedAt: 0,
						endedAt: 0,
					},
				],
			},
		};
		const { runtime } = makeMockRuntime([completedTurn]);

		render(
			<TestHarness runtime={runtime}>
				<PromptText>
					<textarea data-testid="input" />
				</PromptText>
				<PromptAgentControl
					send={<button data-testid="send">Send</button>}
					cancel={<button data-testid="cancel">Stop</button>}
				/>
			</TestHarness>,
		);

		expect(screen.queryByTestId('send')).toBeTruthy();
		expect(screen.queryByTestId('cancel')).toBeNull();
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
