import { StopCode, ZERO_USAGE, type Usage } from '@franklin/mini-acp';
import { text, turn, turnEnd } from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';
import type { CoreEvent } from '../runtime/index.js';
import {
	createCoreScenario,
	defaultUserPrompt,
	emptyCoreScenarioState,
} from '../../../testing/index.js';

const assistantTurn = turn([text('hello'), turnEnd()]);

function usage(input: number, output: number): Usage {
	return {
		tokens: {
			input,
			output,
			cacheRead: 0,
			cacheWrite: 0,
			total: input + output,
		},
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			total: 0,
		},
	};
}

describe('core runtime protocol state', () => {
	it('creates a runtime with protocol methods and initializes the agent', async () => {
		const scenario = await createCoreScenario();

		try {
			expect(scenario.runtime.prompt).toBeDefined();
			expect(scenario.runtime.setLLMConfig).toBeDefined();
			expect(scenario.runtime.cancel).toBeDefined();
			expect(scenario.runtime.coreEvents.subscribe).toBeDefined();
			expect(scenario.mock.calls().initialize).toBe(1);
		} finally {
			await scenario.dispose();
		}
	});

	it('notifies subscribers after llm config changes', async () => {
		const scenario = await createCoreScenario();
		const events: CoreEvent[] = [];
		const unsubscribe = scenario.runtime.coreEvents.subscribe((event) => {
			events.push(event);
		});

		try {
			await scenario.runtime.setLLMConfig({
				provider: 'test-provider',
				model: 'test-model',
				apiKey: 'secret-key',
			});

			expect(events).toEqual([{ type: 'llm-config-changed' }]);
			expect(scenario.mock.context().config).toMatchObject({
				provider: 'test-provider',
				model: 'test-model',
				apiKey: 'secret-key',
			});
		} finally {
			unsubscribe();
			await scenario.dispose();
		}
	});

	it('notifies subscribers after a prompt settles', async () => {
		const scenario = await createCoreScenario({ turns: [assistantTurn] });
		const events: CoreEvent[] = [];
		const unsubscribe = scenario.runtime.coreEvents.subscribe((event) => {
			events.push(event);
		});

		try {
			await scenario.collectPrompt();

			expect(events).toEqual([{ type: 'turn-settled' }]);
		} finally {
			unsubscribe();
			await scenario.dispose();
		}
	});

	it('streams events from the agent', async () => {
		const scenario = await createCoreScenario({ turns: [assistantTurn] });

		try {
			const events = await scenario.collectPrompt();

			expect(events).toEqual([
				{ type: 'turnStart' },
				{
					type: 'update',
					messageId: 'mock-message-1',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: 'hello' }],
					},
				},
				{ type: 'turnEnd', stopCode: StopCode.Finished },
			]);
		} finally {
			await scenario.dispose();
		}
	});

	it('projects a keyed core state snapshot', async () => {
		const scenario = await createCoreScenario();

		try {
			await expect(scenario.state()).resolves.toEqual(emptyCoreScenarioState());
		} finally {
			await scenario.dispose();
		}
	});

	it('exposes the live session on the runtime', async () => {
		const scenario = await createCoreScenario({
			state: {
				core: {
					messages: [],
					llmConfig: {
						model: 'seed-model',
						provider: 'seed-provider',
					},
					usage: ZERO_USAGE,
				},
			},
		});

		try {
			expect(scenario.runtime.session.context().config).toMatchObject({
				model: 'seed-model',
				provider: 'seed-provider',
			});
			expect(scenario.runtime.session.getSnapshot()).toEqual(
				(await scenario.state()).core,
			);
		} finally {
			await scenario.dispose();
		}
	});

	it('tracks conversation messages after a prompt', async () => {
		const scenario = await createCoreScenario({ turns: [assistantTurn] });

		try {
			await scenario.collectPrompt('hi');

			const state = await scenario.state();
			expect(state.core.messages).toContainEqual(defaultUserPrompt());
			expect(state.core.messages).toContainEqual({
				role: 'assistant',
				content: [{ type: 'text', text: 'hello' }],
			});
		} finally {
			await scenario.dispose();
		}
	});

	it('preserves llm config while omitting api keys from state', async () => {
		const scenario = await createCoreScenario({
			state: {
				core: {
					messages: [],
					llmConfig: {
						model: 'seed-model',
						provider: 'seed-provider',
					},
					usage: ZERO_USAGE,
				},
			},
		});

		try {
			await scenario.runtime.setLLMConfig({
				model: 'runtime-model',
				provider: 'runtime-provider',
				apiKey: 'secret-key',
			});

			const state = await scenario.state();
			expect(state.core.llmConfig).toEqual({
				model: 'runtime-model',
				provider: 'runtime-provider',
				reasoning: undefined,
			});
			expect('apiKey' in state.core.llmConfig).toBe(false);
		} finally {
			await scenario.dispose();
		}
	});

	it('fork clones messages and config but resets usage', async () => {
		const turnUsage = usage(10, 5);
		const scenario = await createCoreScenario({
			turns: [turn([text('hello'), turnEnd({ usage: turnUsage })])],
			state: {
				core: {
					messages: [],
					llmConfig: { model: 'test' },
					usage: ZERO_USAGE,
				},
			},
		});

		try {
			await scenario.collectPrompt();

			const forked = await scenario.module.state(scenario.runtime).fork();
			const state = await scenario.state();

			expect(forked.core.messages).toEqual(state.core.messages);
			expect(forked.core.messages).not.toBe(state.core.messages);
			expect(forked.core.llmConfig.model).toBe('test');
			expect(forked.core.usage).toEqual(ZERO_USAGE);
			expect(state.core.usage).toEqual(turnUsage);
		} finally {
			await scenario.dispose();
		}
	});

	it('child clears messages while inheriting config and resetting usage', async () => {
		const turnUsage = usage(10, 5);
		const scenario = await createCoreScenario({
			turns: [turn([text('hello'), turnEnd({ usage: turnUsage })])],
			state: {
				core: {
					messages: [
						{
							role: 'user',
							content: [{ type: 'text', text: 'seed' }],
						},
					],
					llmConfig: { model: 'test' },
					usage: ZERO_USAGE,
				},
			},
		});

		try {
			await scenario.collectPrompt();

			const child = await scenario.module.state(scenario.runtime).child();
			expect(child.core.messages).toEqual([]);
			expect(child.core.llmConfig.model).toBe('test');
			expect(child.core.usage).toEqual(ZERO_USAGE);
		} finally {
			await scenario.dispose();
		}
	});

	it('accumulates turnEnd usage on top of seeded usage', async () => {
		const seededUsage = usage(50, 20);
		const turnUsage = {
			tokens: { input: 10, output: 5, cacheRead: 2, cacheWrite: 1, total: 18 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		} satisfies Usage;
		const scenario = await createCoreScenario({
			turns: [turn([turnEnd({ usage: turnUsage })])],
			state: {
				core: {
					messages: [],
					llmConfig: {},
					usage: seededUsage,
				},
			},
		});

		try {
			await scenario.collectPrompt();

			const state = await scenario.state();
			expect(state.core.usage.tokens).toEqual({
				input: 60,
				output: 25,
				cacheRead: 2,
				cacheWrite: 1,
				total: 88,
			});
		} finally {
			await scenario.dispose();
		}
	});

	it('returns snapshot copies from state.get', async () => {
		const scenario = await createCoreScenario({
			state: {
				core: {
					messages: [],
					llmConfig: {},
					usage: usage(50, 20),
				},
			},
		});

		try {
			const first = await scenario.state();
			first.core.usage.tokens.input = 999;

			const second = await scenario.state();
			expect(second.core.usage.tokens.input).toBe(50);
		} finally {
			await scenario.dispose();
		}
	});

	it('disposes the connector client', async () => {
		const scenario = await createCoreScenario();

		await scenario.dispose();

		expect(scenario.mock.calls().disposes).toBe(1);
	});
});
