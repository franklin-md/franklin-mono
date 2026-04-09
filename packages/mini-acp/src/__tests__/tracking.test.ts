import { describe, it, expect, vi } from 'vitest';
import { trackAgent, trackTurn, trackClient } from '../protocol/tracking.js';
import { CtxTracker } from '../protocol/ctx-tracker.js';
import type { MuAgent, MuClient } from '../protocol/types.js';
import type { TurnClient } from '../base/types.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteParams } from '../types/tool.js';
import { StopCode } from '../types/stop-code.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededTracker(): CtxTracker {
	const tracker = new CtxTracker();
	tracker.apply({
		history: { systemPrompt: 'test', messages: [] },
		tools: [],
	});
	return tracker;
}

function mockAgent(): MuAgent {
	return {
		toolExecute: vi.fn(async (params: ToolExecuteParams) => ({
			toolCallId: params.call.id,
			content: [{ type: 'text' as const, text: 'result' }],
		})),
	};
}

function mockTurn(events: StreamEvent[]): TurnClient {
	return {
		async *prompt(): AsyncGenerator<StreamEvent> {
			for (const e of events) yield e;
		},
		cancel: vi.fn(async () => {}),
	};
}

async function drain(iter: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
	const out: StreamEvent[] = [];
	for await (const e of iter) out.push(e);
	return out;
}

// ---------------------------------------------------------------------------
// trackAgent
// ---------------------------------------------------------------------------

describe('trackAgent', () => {
	it('appends tool call and tool result to tracker', async () => {
		const tracker = seededTracker();
		const tracked = trackAgent(tracker, mockAgent());

		await tracked.toolExecute({
			call: { type: 'toolCall', id: 'c1', name: 'read', arguments: {} },
		});

		const messages = tracker.get().history.messages;
		expect(messages).toHaveLength(2);

		expect(messages[0]).toEqual({
			role: 'assistant',
			content: [{ type: 'toolCall', id: 'c1', name: 'read', arguments: {} }],
		});
		expect(messages[1]).toEqual({
			role: 'toolResult',
			toolCallId: 'c1',
			content: [{ type: 'text', text: 'result' }],
		});
	});

	it('forwards the result from the inner agent', async () => {
		const tracker = seededTracker();
		const tracked = trackAgent(tracker, mockAgent());

		const result = await tracked.toolExecute({
			call: { type: 'toolCall', id: 'c1', name: 'read', arguments: {} },
		});

		expect(result.toolCallId).toBe('c1');
		expect(result.content).toEqual([{ type: 'text', text: 'result' }]);
	});

	it('does not append when toolExecute throws', async () => {
		const tracker = seededTracker();
		const failing: MuAgent = {
			toolExecute: vi.fn(async () => {
				throw new Error('boom');
			}),
		};
		const tracked = trackAgent(tracker, failing);

		await expect(
			tracked.toolExecute({
				call: {
					type: 'toolCall',
					id: 'c1',
					name: 'bad',
					arguments: {},
				},
			}),
		).rejects.toThrow('boom');

		// Tool call was appended before the await, but result was not
		expect(tracker.get().history.messages).toHaveLength(1);
		expect(tracker.get().history.messages[0]!.role).toBe('assistant');
	});
});

// ---------------------------------------------------------------------------
// trackTurn
// ---------------------------------------------------------------------------

describe('trackTurn', () => {
	it('appends user message and assistant updates', async () => {
		const tracker = seededTracker();
		const inner = mockTurn([
			{ type: 'turnStart' },
			{
				type: 'update',
				messageId: 'm1',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'hello' }],
				},
			},
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);
		const tracked = trackTurn(tracker, inner);

		await drain(
			tracked.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const messages = tracker.get().history.messages;
		expect(messages).toHaveLength(2);
		expect(messages[0]!.role).toBe('user');
		expect(messages[1]!.role).toBe('assistant');
	});

	it('yields all events from the inner turn', async () => {
		const tracker = seededTracker();
		const events: StreamEvent[] = [
			{ type: 'turnStart' },
			{
				type: 'update',
				messageId: 'm1',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'hi' }],
				},
			},
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		];
		const tracked = trackTurn(tracker, mockTurn(events));

		const yielded = await drain(
			tracked.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'test' }],
			}),
		);

		expect(yielded).toEqual(events);
	});

	it('delegates cancel to inner turn', async () => {
		const tracker = seededTracker();
		const inner = mockTurn([]);
		const tracked = trackTurn(tracker, inner);

		await tracked.cancel();
		expect(inner.cancel).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// trackClient
// ---------------------------------------------------------------------------

describe('trackClient', () => {
	it('tracks setContext via tracker.apply', async () => {
		const tracker = seededTracker();
		const inner: MuClient = {
			initialize: vi.fn(async () => {}),
			cancel: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			async *prompt(): AsyncGenerator<StreamEvent> {},
		};
		const tracked = trackClient(tracker, inner);

		await tracked.setContext({
			history: { systemPrompt: 'new', messages: [] },
		});

		expect(tracker.get().history.systemPrompt).toBe('new');
		expect(inner.setContext).toHaveBeenCalled();
	});

	it('tracks user messages and updates via prompt', async () => {
		const tracker = seededTracker();
		const inner: MuClient = {
			initialize: vi.fn(async () => {}),
			cancel: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			async *prompt(): AsyncGenerator<StreamEvent> {
				yield {
					type: 'update',
					messageId: 'm1',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: 'response' }],
					},
				};
			},
		};
		const tracked = trackClient(tracker, inner);

		await drain(
			tracked.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		const messages = tracker.get().history.messages;
		expect(messages).toHaveLength(2);
		expect(messages[0]!.role).toBe('user');
		expect(messages[1]!.role).toBe('assistant');
	});

	it('delegates initialize without tracking', async () => {
		const tracker = seededTracker();
		const inner: MuClient = {
			initialize: vi.fn(async () => {}),
			cancel: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			async *prompt(): AsyncGenerator<StreamEvent> {},
		};
		const tracked = trackClient(tracker, inner);

		await tracked.initialize();
		expect(inner.initialize).toHaveBeenCalled();
		expect(tracker.get().history.messages).toHaveLength(0);
	});
});
