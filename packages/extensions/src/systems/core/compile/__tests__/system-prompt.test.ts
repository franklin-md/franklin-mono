import { describe, it, expect, vi } from 'vitest';
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
): Promise<MiniACPClient> {
	const assembler = buildSystemPromptAssembler(
		handlers,
		() => undefined as never,
	);
	const decorator = createSystemPromptDecorator(assembler);
	return decorator.client(inner);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSystemPromptDecorator', () => {
	it('calls setContext with assembled prompt before first prompt', async () => {
		const inner = stubClient();
		const wrapped = await wire(
			[
				(ctx) => ctx.setPart('extension A'),
				(ctx) => ctx.setPart('extension B'),
			],
			inner,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: { systemPrompt: 'extension A\n\nextension B' },
		});
		expect(inner.prompt).toHaveBeenCalled();
	});

	it('does not call setContext when handlers produce the same result', async () => {
		const inner = stubClient();
		const wrapped = await wire([(ctx) => ctx.setPart('extra')], inner);

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
		const inner = stubClient();
		let value = 'v1';
		const wrapped = await wire([(ctx) => ctx.setPart(value)], inner);

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
			history: { systemPrompt: 'v2' },
		});
	});

	it('handler that does not setPart leaves its fragment unchanged across turns', async () => {
		const inner = stubClient();
		let turn = 0;
		const wrapped = await wire(
			[
				(ctx) => {
					if (turn === 0) ctx.setPart('sticky');
				},
			],
			inner,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '1' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);
		expect(inner.setContext).toHaveBeenLastCalledWith({
			history: { systemPrompt: 'sticky' },
		});

		turn = 1;
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '2' }] }),
		);
		// Fragment persists → same assembled → no second setContext.
		expect(inner.setContext).toHaveBeenCalledTimes(1);
	});

	it('handler that never calls setPart is excluded from assembly', async () => {
		const inner = stubClient();
		const wrapped = await wire(
			[
				() => {
					/* no setPart */
				},
				(ctx) => ctx.setPart('present'),
			],
			inner,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: { systemPrompt: 'present' },
		});
	});

	it('does not call setContext when there are no handlers', async () => {
		const inner = stubClient();
		const wrapped = await wire([], inner);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		// Assembled === '' === lastSent seed, so no dispatch.
		expect(inner.setContext).not.toHaveBeenCalled();
	});

	it('does not send messages in the patch', async () => {
		const inner = stubClient();
		const wrapped = await wire([(ctx) => ctx.setPart('extra')], inner);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		const setContextArg = vi.mocked(inner.setContext).mock.calls[0]![0];
		expect(setContextArg.history).toEqual({
			systemPrompt: 'extra',
		});
	});

	it('awaits async handlers', async () => {
		const inner = stubClient();
		const wrapped = await wire(
			[
				async (ctx) => {
					await Promise.resolve();
					ctx.setPart('async-value');
				},
			],
			inner,
		);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: { systemPrompt: 'async-value' },
		});
	});

	it('server side is a passthrough', async () => {
		const assembler = buildSystemPromptAssembler([], () => undefined as never);
		const decorator = createSystemPromptDecorator(assembler);
		const agent = stubAgent();
		const result = await decorator.server(agent);
		expect(result).toBe(agent);
	});

	it('a handler still dispatches setContext from an empty starting prompt', async () => {
		const inner = stubClient();
		const wrapped = await wire([(ctx) => ctx.setPart('only-fragment')], inner);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: { systemPrompt: 'only-fragment' },
		});
	});
});
