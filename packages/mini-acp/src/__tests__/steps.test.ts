import { describe, expect, it, vi } from 'vitest';
import {
	createMockMiniACP,
	toolCalls,
	text,
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

const prompt = {
	role: 'user' as const,
	content: [{ type: 'text' as const, text: 'hello' }],
};
const usage: Usage = {
	tokens: { input: 10, output: 2, cacheRead: 3, cacheWrite: 1, total: 16 },
	cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 },
};

describe('stepped helpers and scripted mocks', () => {
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
			expect(last.turnEnd?.usage?.tokens.total).toBe(32);
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
