import { describe, expect, it, vi } from 'vitest';
import { createCoreScenario } from '../../../../testing/core-scenario.js';
import type { ToolSourceTool } from '../../api/tool-source.js';

const remote: ToolSourceTool = {
	definition: {
		name: 'remote_search',
		description: 'Search',
		inputSchema: {
			type: 'object',
			properties: { query: { type: 'string' } },
			required: ['query'],
		},
	},
	execute: async () => ({ found: true }),
};

describe('dynamic tool sources', () => {
	it('prepares sources before context sync and refreshes existing agents on the next turn', async () => {
		let tools: ToolSourceTool[] = [remote];
		const dispose = vi.fn(async () => {});
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.registerToolSource(() => ({
						prepare: async () => tools,
						dispose,
					}));
				},
			],
		});
		expect(scenario.mock.context().tools).toEqual([]);
		await scenario.collectPrompt();
		expect(scenario.mock.context().tools.map((t) => t.name)).toEqual([
			'remote_search',
		]);
		tools = [];
		await scenario.collectPrompt();
		expect(scenario.mock.context().tools).toEqual([]);
		await scenario.dispose();
		expect(dispose).toHaveBeenCalledOnce();
	});
	it('keeps local chat available when a source fails', async () => {
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.registerToolSource(() => ({
						prepare: async () => {
							throw new Error('offline');
						},
						dispose: async () => {},
					}));
				},
			],
		});
		await expect(scenario.collectPrompt()).resolves.toBeDefined();
		await scenario.dispose();
	});
});

it('delivers active-turn cancellation to an application tool invocation', async () => {
	const { toolCalls, turn, turnEnd } = await import('@franklin/mini-acp/mock');
	let started = false;
	let aborted = false;
	const scenario = await createCoreScenario({
		turns: [
			turn([toolCalls([{ name: 'remote_wait', arguments: {} }]), turnEnd()]),
		],
		extensions: [
			(api) => {
				api.registerToolSource(() => ({
					prepare: async () => [
						{
							definition: {
								name: 'remote_wait',
								description: 'Wait',
								inputSchema: { type: 'object' },
							},
							execute: async (_args, invocation) => {
								started = true;
								return new Promise<string>((resolve) => {
									invocation.signal.addEventListener(
										'abort',
										() => {
											aborted = true;
											resolve('Cancelled');
										},
										{ once: true },
									);
								});
							},
						},
					],
					dispose: async () => {},
				}));
			},
		],
	});
	try {
		const running = scenario.collectPrompt();
		await vi.waitFor(() => expect(started).toBe(true));
		await scenario.runtime.cancel();
		await running;
		expect(aborted).toBe(true);
	} finally {
		await scenario.dispose();
	}
});
