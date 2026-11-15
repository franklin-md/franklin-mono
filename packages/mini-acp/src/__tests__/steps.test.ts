import { describe, expect, it, vi } from 'vitest';
import {
	createMockMiniACP,
	toolCalls,
	text,
	textChunkStream,
	textChunks,
	thinkingChunkStream,
	derive,
	turnEnd,
	turn,
} from '../mock/index.js';
import { ContextTracker } from '../protocol/context-tracker.js';
import { UsageTracker, ZERO_USAGE } from '../protocol/usage-tracker.js';
import {
	decorateTurn,
	trackAgent,
	trackClient,
	trackUsage,
} from '../protocol/tracking.js';
import { debugMiniACP } from '../debug/index.js';
import { collect } from '../utils/collect.js';
import { collectEvents } from './utils/collect-events.js';
import type { Usage } from '../types/usage.js';
import { StopCode } from '../types/stop-code.js';
import type { StreamEvent } from '../types/stream.js';

const prompt = {
	role: 'user' as const,
	content: [{ type: 'text' as const, text: 'hello' }],
};
const usage: Usage = {
	tokens: { input: 10, output: 2, cacheRead: 3, cacheWrite: 1, total: 16 },
	cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 },
};

describe('stepped helpers and scripted mocks', () => {
	it('cancels before the first chunk without creating an empty update', async () => {
		const mock = createMockMiniACP({
			turns: [turn([textChunkStream('abc'), turnEnd()])],
		});
		const client = await mock.connector({
			toolExecute: async ({ call }) => ({ toolCallId: call.id, content: [] }),
		});
		try {
			const execution = collectEvents(client.prompt(prompt));
			await client.cancel();
			expect((await execution).map((event) => event.type)).toEqual([
				'turnStart',
				'turnEnd',
			]);
			expect(mock.context().messages).toEqual([prompt]);
		} finally {
			await client.dispose();
		}
	});

	it('finalizes delivered text when cancelled while awaiting another chunk', async () => {
		vi.useFakeTimers();
		const mock = createMockMiniACP({
			turns: [
				turn([
					textChunks([{ text: 'a' }, { text: 'bc', delayMs: 100 }]),
					turnEnd(),
				]),
			],
		});
		const client = await mock.connector({
			toolExecute: async ({ call }) => ({ toolCallId: call.id, content: [] }),
		});
		try {
			const iterator = client.prompt(prompt)[Symbol.asyncIterator]();
			await iterator.next();
			expect(await iterator.next()).toMatchObject({
				value: { type: 'chunk', content: { text: 'a' } },
			});
			const pending = iterator.next();
			await vi.advanceTimersByTimeAsync(0);
			expect(vi.getTimerCount()).toBe(1);
			await client.cancel();
			await vi.runOnlyPendingTimersAsync();
			expect(await pending).toMatchObject({
				value: {
					type: 'update',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: 'a' }],
					},
				},
			});
			expect(await iterator.next()).toMatchObject({
				value: { type: 'turnEnd', stopCode: StopCode.Cancelled },
			});
			expect(await iterator.next()).toMatchObject({ done: true });
		} finally {
			await client.dispose();
			vi.useRealTimers();
		}
	});

	it.each([
		{ type: 'text', stream: textChunkStream, chunks: 1 },
		{ type: 'text', stream: textChunkStream, chunks: 3 },
		{ type: 'thinking', stream: thinkingChunkStream, chunks: 1 },
		{ type: 'thinking', stream: thinkingChunkStream, chunks: 3 },
	])(
		'finalizes $type when cancelled after $chunks chunks',
		async ({ type, stream, chunks }) => {
			const later = vi.fn(() => [text('must not run')]);
			const mock = createMockMiniACP({
				turns: [
					turn([
						stream('abc'),
						derive(later),
						toolCalls([{ name: 'echo' }]),
						turnEnd({ usage }),
					]),
				],
			});
			const context = new ContextTracker();
			const inner = await mock.connector({
				toolExecute: async ({ call }) => ({ toolCallId: call.id, content: [] }),
			});
			const client = trackClient(context, inner);
			const events: StreamEvent[] = [];
			async function* cancelAfterChunks() {
				let seen = 0;
				for await (const event of client.prompt(prompt)) {
					events.push(event);
					if (event.type === 'chunk' && ++seen === chunks)
						await client.cancel();
					if (event.type === 'turnEnd')
						await client.setContext({ systemPrompt: 'idle' });
					yield event;
				}
			}
			try {
				const result = await collect(cancelAfterChunks());
				expect(events.map((event) => event.type)).toEqual([
					'turnStart',
					...Array.from({ length: chunks }, () => 'chunk'),
					'update',
					'turnEnd',
				]);
				expect(events.find((event) => event.type === 'update')?.messageId).toBe(
					events.find((event) => event.type === 'chunk')?.messageId,
				);
				expect(result.messages).toEqual([
					{
						role: 'assistant',
						content: [{ type, text: 'abc'.slice(0, chunks) }],
					},
				]);
				expect(result.turnEnd).toEqual({
					type: 'turnEnd',
					stopCode: StopCode.Cancelled,
					stepUsage: ZERO_USAGE,
					usage: ZERO_USAGE,
				});
				expect(result.stepEnd).toBeUndefined();
				expect(context.get().messages).toEqual([prompt, ...result.messages]);
				expect(context.get()).toEqual(mock.context());
				expect(later).not.toHaveBeenCalled();
				expect(mock.calls().toolCalls).toEqual([]);
				expect(await collectEvents(client.continue())).toEqual([]);
			} finally {
				await inner.dispose();
			}
		},
	);

	it('tracks continuation context and usage once through all wrappers, including no-op continue', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const context = new ContextTracker();
		const totals = new UsageTracker();
		const mock = createMockMiniACP({
			turns: [
				turn([
					text('checking'),
					toolCalls([{ name: 'echo' }], { stepUsage: usage }),
					text('checked'),
					turnEnd({ usage }),
				]),
			],
		});
		const inner = await mock.connector(
			trackAgent(context, {
				toolExecute: async ({ call }) => ({
					toolCallId: call.id,
					content: [{ type: 'text', text: 'result' }],
				}),
			}),
		);
		const client = debugMiniACP(
			decorateTurn(trackClient(context, inner), (turn) =>
				trackUsage(totals, turn),
			),
			'steps',
		);
		try {
			await client.initialize();
			await client.setContext({ systemPrompt: 'before' });
			const first = await collect(client.prompt(prompt));
			expect(first.stepEnd).toEqual({ type: 'stepEnd', stepUsage: usage });
			expect(first.turnEnd).toBeUndefined();
			expect(totals.get()).toEqual(usage);
			await client.setContext({ systemPrompt: 'after' });
			const last = await collect(client.continue());
			expect(last.turnEnd?.stepUsage).toEqual(usage);
			expect(last.turnEnd?.usage.tokens.total).toBe(32);
			expect(totals.get().tokens.total).toBe(32);
			expect(totals.get().cost.total).toBe(20);
			expect(context.get().messages.filter((m) => m.role === 'user')).toEqual([
				prompt,
			]);
			expect(context.get().messages.at(-1)?.content).toEqual([
				{ type: 'text', text: 'checked' },
			]);
			expect(context.get()).toEqual(mock.context());
			const beforeNoop = context.get();
			expect(await collectEvents(client.continue())).toEqual([]);
			expect(context.get()).toEqual(beforeNoop);
			expect(totals.get().tokens.total).toBe(32);
			expect(mock.calls().prompts).toEqual([prompt]);
			expect(mock.calls().continues).toBe(1);
			expect(log.mock.calls.flat().join('\n')).toContain('stepEnd');
			expect(log.mock.calls.flat().join('\n')).toContain('continue');
		} finally {
			log.mockRestore();
			await inner.dispose();
		}
	});

	it('rejects active mock drives and releases before its terminal is received', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const mock = createMockMiniACP({
			turns: [turn([toolCalls([{ name: 'echo' }]), text('done'), turnEnd()])],
		});
		const client = await mock.connector({
			toolExecute: async ({ call }) => {
				await gate;
				return { toolCallId: call.id, content: [] };
			},
		});
		const stopCodes: Array<StopCode | undefined> = [];
		const events = (async () => {
			for await (const event of client.prompt(prompt)) {
				if (event.type === 'stepEnd') {
					await client.setContext({ messages: [] });
					stopCodes.push((await collect(client.continue())).turnEnd?.stopCode);
				}
			}
		})();
		await vi.waitFor(() => expect(mock.calls().toolCalls).toHaveLength(1));
		await expect(collect(client.continue())).rejects.toThrow(
			'already in progress',
		);
		await expect(collect(client.prompt(prompt))).rejects.toThrow(
			'already in progress',
		);
		release();
		await events;
		expect(stopCodes).toEqual([StopCode.Finished]);
		await client.dispose();
	});

	it('cancels the paused mock on its next continuation without replaying tools', async () => {
		const mock = createMockMiniACP({
			turns: [
				turn([
					toolCalls([{ name: 'echo' }], { stepUsage: usage }),
					text('must not run'),
					turnEnd(),
				]),
			],
		});
		const client = await mock.connector({
			toolExecute: async ({ call }) => ({ toolCallId: call.id, content: [] }),
		});
		await collect(client.prompt(prompt));
		await client.cancel();
		const result = await collect(client.continue());
		expect(result.messages).toEqual([]);
		expect(result.turnEnd).toEqual({
			type: 'turnEnd',
			stopCode: StopCode.Cancelled,
			stepUsage: ZERO_USAGE,
			usage,
		});
		expect(await collectEvents(client.continue())).toEqual([]);
		expect(mock.calls().toolCalls).toHaveLength(1);
		await client.dispose();
	});
	it('retains a batch delta when cancelled while its tools settle', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const mock = createMockMiniACP({
			turns: [
				turn([
					toolCalls([{ name: 'echo' }], { stepUsage: usage }),
					text('not reached'),
					turnEnd(),
				]),
			],
		});
		const client = await mock.connector({
			toolExecute: async ({ call }) => {
				await gate;
				return { toolCallId: call.id, content: [] };
			},
		});
		const execution = collect(client.prompt(prompt));
		await vi.waitFor(() => expect(mock.calls().toolCalls).toHaveLength(1));
		await client.cancel();
		release();
		expect((await execution).turnEnd).toEqual({
			type: 'turnEnd',
			stopCode: StopCode.Cancelled,
			stepUsage: usage,
			usage,
		});
		await client.dispose();
	});

	it('reports earlier batch usage when the final scripted step has no usage', async () => {
		const mock = createMockMiniACP({
			turns: [
				turn([toolCalls([{ name: 'echo' }], { stepUsage: usage }), turnEnd()]),
			],
		});
		const client = await mock.connector({
			toolExecute: async ({ call }) => ({ toolCallId: call.id, content: [] }),
		});
		await collect(client.prompt(prompt));
		expect((await collect(client.continue())).turnEnd).toEqual({
			type: 'turnEnd',
			stopCode: StopCode.Finished,
			stepUsage: ZERO_USAGE,
			usage,
		});
		await client.dispose();
	});
});
