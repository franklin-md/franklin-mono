import { describe, it, expect, vi } from 'vitest';
import { CtxTracker } from '@franklin/mini-acp';
import type {
	MiniACPAgent,
	MiniACPClient,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import { createContributionDecorator } from '../decorators/contribution.js';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createContributionDecorator', () => {
	it('calls setContext with assembled prompt before first prompt', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const decorator = createContributionDecorator(
			[() => 'extension A', () => 'extension B'],
			tracker,
			'base',
		);

		const wrapped = await decorator.client(inner);
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

	it('does not call setContext when contributions produce same result', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const decorator = createContributionDecorator(
			[() => 'extra'],
			tracker,
			'base',
		);

		const wrapped = await decorator.client(inner);

		// First prompt — setContext should be called
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '1' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);

		// Second prompt — same contributions, no setContext call
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '2' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);
	});

	it('calls setContext again when contribution value changes', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		let value = 'v1';
		const decorator = createContributionDecorator(
			[() => value],
			tracker,
			'base',
		);

		const wrapped = await decorator.client(inner);

		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: '1' }] }),
		);
		expect(inner.setContext).toHaveBeenCalledTimes(1);

		// Change contribution value
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

	it('undefined contribution is excluded from assembly', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const decorator = createContributionDecorator(
			[() => undefined, () => 'present'],
			tracker,
			'base',
		);

		const wrapped = await decorator.client(inner);
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

	it('does not call setContext with no contributions', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const decorator = createContributionDecorator([], tracker, 'base');

		const wrapped = await decorator.client(inner);
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		// Base alone === base, which is already sent by the tracker seed.
		// The decorator should not call setContext on first prompt when
		// the assembled result is just the base (which was already seeded).
		expect(inner.setContext).not.toHaveBeenCalled();
	});

	it('preserves existing messages in setContext call', async () => {
		const tracker = seededTracker('base');
		tracker.append({
			role: 'user',
			content: [{ type: 'text', text: 'previous' }],
		});

		const inner = stubClient();
		const decorator = createContributionDecorator(
			[() => 'extra'],
			tracker,
			'base',
		);

		const wrapped = await decorator.client(inner);
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

	it('supports async contribution functions', async () => {
		const tracker = seededTracker('base');
		const inner = stubClient();
		const decorator = createContributionDecorator(
			[async () => 'async-value'],
			tracker,
			'base',
		);

		const wrapped = await decorator.client(inner);
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

	it('server side is passthrough', async () => {
		const tracker = seededTracker('base');
		const decorator = createContributionDecorator([], tracker, 'base');
		const agent = stubAgent();
		const result = await decorator.server(agent);
		expect(result).toBe(agent);
	});

	it('empty base prompt with contributions works', async () => {
		const tracker = seededTracker('');
		const inner = stubClient();
		const decorator = createContributionDecorator(
			[() => 'only-contribution'],
			tracker,
			'',
		);

		const wrapped = await decorator.client(inner);
		await collect(
			wrapped.prompt({ role: 'user', content: [{ type: 'text', text: 'hi' }] }),
		);

		expect(inner.setContext).toHaveBeenCalledWith({
			history: {
				systemPrompt: 'only-contribution',
				messages: [],
			},
		});
	});
});
