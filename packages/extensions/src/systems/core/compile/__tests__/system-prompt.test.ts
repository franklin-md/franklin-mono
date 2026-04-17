import { describe, it, expect, vi } from 'vitest';
import { CtxTracker } from '@franklin/mini-acp';
import type {
	MiniACPAgent,
	MiniACPClient,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import { createSystemPromptDecorator } from '../decorators/system-prompt.js';
import { buildSystemPromptAssembler } from '../builders/system-prompt.js';
import type { SystemPromptHandler } from '../../api/handlers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededTracker(systemPrompt = 'base'): CtxTracker {
	const tracker = new CtxTracker();
	tracker.apply({
		history: { systemPrompt, messages: [] },
		tools: [],
	});
	return tracker;
}

function stubClient(overrides: Partial<MiniACPClient> = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => {}),
		...overrides,
	} as unknown as MiniACPClient;
}

function stubAgent(overrides: Partial<MiniACPAgent> = {}): MiniACPAgent {
	return {
		toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'ok' }],
		})),
		...overrides,
	} as unknown as MiniACPAgent;
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

function wire(
	handlers: SystemPromptHandler[],
	inner: MiniACPClient,
	basePrompt: string,
	tracker: CtxTracker,
): Promise<MiniACPClient> {
	const assembler = buildSystemPromptAssembler(handlers, basePrompt);
	const decorator = createSystemPromptDecorator(assembler, tracker, basePrompt);
	return decorator.client(inner);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSystemPromptDecorator', () => {
	it('calls setContext with assembled prompt before first prompt', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const wrapped = await wire(
			[
				(ctx) => ctx.setPart('extension A'),
				(ctx) => ctx.setPart('extension B'),
			],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: {
				systemPrompt: 'base\n\nextension A\n\nextension B',
				messages: [],
			},
		});
		expect(inner.prompt).toHaveBeenCalled();
	});

	it('does not call setContext when handlers produce the same result', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const wrapped = await wire(
			[(ctx) => ctx.setPart('extra')],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '1' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '2' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);
	});

	it('calls setContext again when a handler changes its fragment', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		let value = 'v1';
		const wrapped = await wire(
			[(ctx) => ctx.setPart(value)],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '1' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);

		value = 'v2';
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '2' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(2);
		expect(inner.setContext).toHaveBeenLastCalledWith({
			history: {
				systemPrompt: 'base\n\nv2',
				messages: [],
			},
		});
	});

	it('handler that does not setPart leaves its fragment unchanged across turns', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		let turn = 0;
		const wrapped = await wire(
			[
				(ctx) => {
					if (turn === 0) ctx.setPart('sticky');
				},
			],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '1' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);
		expect(inner.setContext).toHaveBeenLastCalledWith({
			history: { systemPrompt: 'base\n\nsticky', messages: [] },
		});

		turn = 1;
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '2' }] }),
		);
		// Fragment persists → same assembled → no second setContext.
		expect(inner.setContext).toHaveBeenCalledTimes(1);
	});

	it('handler that never calls setPart is excluded from assembly', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const wrapped = await wire(
			[
				() => {
					/* no setPart */
				},
				(ctx) => ctx.setPart('present'),
			],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: {
				systemPrompt: 'base\n\npresent',
				messages: [],
			},
		});
	});

	it('does not call setContext when there are no handlers', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const wrapped = await wire([], inner, 'base', tracker);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		// Assembled === 'base' === lastSent seed, so no dispatch.
		expect(inner.setContext).not.toHaveBeenCalled();
	});

	it('preserves existing tracked messages in setContext call', async () => {
		const tracker = seededTracker('base');
		tracker.append({
			role: 'user',
			content: [{ type: 'text', text: 'previous' }],
		});

		const inner = stubClient();
		const wrapped = await wire(
			[(ctx) => ctx.setPart('extra')],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		const setContextArg = vi.mocked(inner.setContext).mock.calls[0]![0];
		expect(setContextArg.history!.messages).toHaveLength(1);
		expect(setContextArg.history!.messages[0]).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'previous' }],
		});
	});

	it('awaits async handlers', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const wrapped = await wire(
			[
				async (ctx) => {
					await Promise.resolve();
					ctx.setPart('async-value');
				},
			],
			inner,
			'base',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: {
				systemPrompt: 'base\n\nasync-value',
				messages: [],
			},
		});
	});

	it('server side is a passthrough', async () => {
		const assembler = buildSystemPromptAssembler([], 'base');
		const decorator = createSystemPromptDecorator(
			assembler,
			seededTracker('base'),
			'base',
		);
		const agent = stubAgent();
		const result = await decorator.server(agent);
		expect(result).toBe(agent);
	});

	it('empty base prompt with a handler still dispatches setContext', async () => {
		const tracker = seededTracker('');
		const inner = stubClient();
		const wrapped = await wire(
			[(ctx) => ctx.setPart('only-fragment')],
			inner,
			'',
			tracker,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: {
				systemPrompt: 'only-fragment',
				messages: [],
			},
		});
	});
});
