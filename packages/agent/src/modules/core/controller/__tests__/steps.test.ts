import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	toolCalls,
	text,
	turnEnd,
	turn,
	derive,
} from '@franklin/mini-acp/mock';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { createCoreScenario } from '../../../../testing/index.js';

const usage = {
	...ZERO_USAGE,
	tokens: { ...ZERO_USAGE.tokens, input: 10, total: 10 },
};

describe('controller drives one logical runtime turn', () => {
	it('syncs ordinary context between steps and retains public turn/usage behavior', async () => {
		let system = 'before';
		const observed: string[] = [];
		const scenario = await createCoreScenario({
			turns: [
				turn([
					text('looking'),
					toolCalls([{ name: 'lookup' }], { stepUsage: usage }),
					derive(({ context }) => {
						expect(context.systemPrompt).toBe('after');
						expect(
							context.messages.filter((m) => m.role === 'user'),
						).toHaveLength(1);
						return [text('done')];
					}),
					turnEnd({ usage }),
				]),
			],
			extensions: [
				(api) => {
					api.on('systemPrompt', (prompt) => prompt.setPart(system));
					api.on('prompt', () => {
						observed.push('prompt');
					});
					api.on('turnStart', () => {
						observed.push('start');
					});
					api.on('turnEnd', () => {
						observed.push('end');
					});
					api.registerTool(
						{ name: 'lookup', description: 'Lookup', schema: z.object({}) },
						{
							execute: () => {
								system = 'after';
								return 'result';
							},
						},
					);
				},
			],
		});
		const lifecycle: string[] = [];
		scenario.runtime.coreEvents.subscribe((event) =>
			lifecycle.push(event.type),
		);
		try {
			const events = await scenario.collectPrompt('hello');
			expect(events.map((e) => e.type)).toEqual([
				'turnStart',
				'update',
				'update',
				'turnEnd',
			]);
			expect(observed).toEqual(['prompt', 'start', 'end']);
			expect(lifecycle).toEqual(['turn-settled']);
			expect(scenario.mock.calls().prompts).toHaveLength(1);
			expect(scenario.mock.calls().continues).toBe(1);
			expect(scenario.mock.calls().setContext[1]).toEqual({
				systemPrompt: 'after',
			});
			expect(scenario.runtime.getSession().usage.tokens.total).toBe(20);
			expect(events.at(-1)).toMatchObject({
				type: 'turnEnd',
				usage: { tokens: { total: 20 } },
			});
			expect(
				scenario.runtime
					.getSession()
					.entries.filter(
						(entry) =>
							entry.type === 'message' && entry.message.role === 'user',
					),
			).toHaveLength(1);
		} finally {
			await scenario.dispose();
		}
	});

	it('cancels while idle context sync is awaiting, without executing the next scripted response', async () => {
		let enter!: () => void;
		let release!: () => void;
		const boundary = new Promise<void>((resolve) => {
			enter = resolve;
		});
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let syncs = 0;
		const scenario = await createCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'lookup' }], { stepUsage: usage }),
					text('not reached'),
					turnEnd(),
				]),
			],
			extensions: [
				(api) => {
					api.on('systemPrompt', async () => {
						if (++syncs === 2) {
							enter();
							await gate;
						}
					});
					api.registerTool(
						{ name: 'lookup', description: 'Lookup', schema: z.object({}) },
						{ execute: () => 'result' },
					);
				},
			],
		});
		try {
			const execution = scenario.collectPrompt();
			await boundary;
			await scenario.runtime.cancel();
			release();
			const events = await execution;
			expect(events.map((e) => e.type)).toEqual(['turnStart', 'turnEnd']);
			expect(events.at(-1)).toMatchObject({
				type: 'turnEnd',
				stopCode: 1001,
				usage,
			});
			expect(scenario.runtime.getSession().usage).toEqual(usage);
		} finally {
			release();
			await scenario.dispose();
		}
	});
	it('releases the logical turn before forwarding turnEnd to a reentrant consumer', async () => {
		const scenario = await createCoreScenario();
		try {
			for await (const event of scenario.runtime.prompt({
				role: 'user',
				content: [],
			})) {
				if (event.type === 'turnEnd') await scenario.collectPrompt('next');
			}
			expect(scenario.mock.calls().prompts).toHaveLength(2);
		} finally {
			await scenario.dispose();
		}
	});

	it('drains a paused turn if boundary context synchronization fails', async () => {
		let syncs = 0;
		const scenario = await createCoreScenario({
			turns: [
				turn([toolCalls([{ name: 'lookup' }]), text('not reached'), turnEnd()]),
			],
			extensions: [
				(api) => {
					api.on('systemPrompt', () => {
						if (++syncs === 2) throw new Error('sync failed');
					});
					api.registerTool(
						{ name: 'lookup', description: 'Lookup', schema: z.object({}) },
						{ execute: () => 'result' },
					);
				},
			],
		});
		try {
			await expect(scenario.collectPrompt()).rejects.toThrow('sync failed');
			await expect(scenario.collectPrompt('retry')).resolves.toHaveLength(2);
			expect(scenario.mock.calls().cancels).toBe(1);
		} finally {
			await scenario.dispose();
		}
	});
});
