import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createCoreStateModule } from '../module.js';
import { createRuntime } from '../../../testing/index.js';
import type { CoreEvent } from '../runtime/index.js';
import {
	createSessionAdapter,
	StopCode,
	ZERO_USAGE,
	type Context,
	type MiniACPConnector,
	type Update,
	type StreamEvent,
	type Usage,
} from '@franklin/mini-acp';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockConnector(
	onPrompt?: (context: Context) => void,
	turnUsage?: Usage,
): MiniACPConnector {
	return (server) => {
		const client = createSessionAdapter((context) => {
			onPrompt?.(context);
			return {
				async *prompt() {
					yield {
						type: 'update' as const,
						messageId: 'm1',
						message: {
							role: 'assistant' as const,
							content: [{ type: 'text' as const, text: 'hello' }],
						},
					} satisfies Update;
					yield {
						type: 'turnEnd' as const,
						stopCode: StopCode.Finished,
						...(turnUsage ? { usage: turnUsage } : {}),
					};
				},
				async cancel() {},
			};
		}, server);

		return {
			...client,
			dispose: vi.fn(async () => {}),
		};
	};
}

async function collect(
	iter: AsyncIterable<StreamEvent>,
): Promise<StreamEvent[]> {
	const items: StreamEvent[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createCoreStateModule', () => {
	it('create returns a runtime with protocol methods', async () => {
		const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
		const system = createCoreStateModule(mock.connector);

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		expect(runtime.prompt).toBeDefined();
		expect(runtime.setLLMConfig).toBeDefined();
		expect(runtime.cancel).toBeDefined();
		expect(runtime.coreEvents.subscribe).toBeDefined();
		expect(mock.calls().initialize).toBe(1);

		await runtime.dispose();
	});

	it('coreEvents emits llm config changes after setLLMConfig', async () => {
		const system = createCoreStateModule(createMockConnector());
		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);
		const events: CoreEvent[] = [];
		const unsubscribe = runtime.coreEvents.subscribe((event) => {
			events.push(event);
		});

		await runtime.setLLMConfig({
			provider: 'test-provider',
			model: 'test-model',
			apiKey: 'secret-key',
		});

		expect(events).toEqual([{ type: 'llm-config-changed' }]);

		unsubscribe();
		await runtime.dispose();
	});

	it('coreEvents emits turn-settled after prompt settles', async () => {
		const system = createCoreStateModule(createMockConnector());
		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);
		const events: CoreEvent[] = [];
		const unsubscribe = runtime.coreEvents.subscribe((event) => {
			events.push(event);
		});

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(events).toEqual([{ type: 'turn-settled' }]);

		unsubscribe();
		await runtime.dispose();
	});

	it('prompt streams events from the agent', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		const events = await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(events.some((e: StreamEvent) => e.type === 'update')).toBe(true);
		expect(events.some((e: StreamEvent) => e.type === 'turnEnd')).toBe(true);

		await runtime.dispose();
	});

	it('state returns keyed core state with messages', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		const state = await system.state(runtime).get();
		expect(state.core).toBeDefined();
		expect(state.core.messages).toEqual([]);

		await runtime.dispose();
	});

	it('state tracks conversation after prompt', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const state = await system.state(runtime).get();
		expect(state.core.messages.length).toBeGreaterThanOrEqual(2);

		await runtime.dispose();
	});

	it('state preserves llmConfig', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {
						model: 'test-model',
						provider: 'test-provider',
					},
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		const state = await system.state(runtime).get();
		expect(state.core.llmConfig.model).toBe('test-model');
		expect(state.core.llmConfig.provider).toBe('test-provider');

		await runtime.dispose();
	});

	it('state strips apiKey from config', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {
						model: 'test-model',
						provider: 'test-provider',
					},
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		const state = await system.state(runtime).get();
		expect('apiKey' in state.core.llmConfig).toBe(false);

		await runtime.dispose();
	});

	it('fork clones messages and config', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [
						{
							role: 'user',
							content: [{ type: 'text', text: 'hello' }],
						},
					],
					llmConfig: { model: 'test' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		const forked = await system.state(runtime).fork();
		expect(forked.core.messages).toHaveLength(1);
		expect(forked.core.llmConfig.model).toBe('test');

		const state = await system.state(runtime).get();
		expect(forked.core.messages).not.toBe(state.core.messages);

		await runtime.dispose();
	});

	it('child returns empty messages with same config', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [
						{
							role: 'user',
							content: [{ type: 'text', text: 'hello' }],
						},
					],
					llmConfig: { model: 'test' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		const childState = await system.state(runtime).child();
		expect(childState.core.messages).toHaveLength(0);
		expect(childState.core.llmConfig.model).toBe('test');

		await runtime.dispose();
	});

	it('dispose cleans up connector client', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		await runtime.dispose();
	});

	it('extensions receive CoreSignature for handler registration', async () => {
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[
				(api) => {
					api.on('prompt', (_params) => {
						// side effect
					});
				},
			],
		);

		expect(runtime.prompt).toBeDefined();

		await runtime.dispose();
	});

	it('emptyState returns empty messages with no config', () => {
		const system = createCoreStateModule(createMockConnector());
		const empty = system.emptyState();

		expect(empty.core.messages).toEqual([]);
		expect(empty.core.llmConfig).toEqual({});
	});

	it('systemPrompt handler assembles system prompt before first turn', async () => {
		let capturedContext: Context | undefined;
		const system = createCoreStateModule(
			createMockConnector((context) => {
				capturedContext = context;
			}),
		);

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {},
					usage: ZERO_USAGE,
				},
			},
			[
				(api) => {
					api.on('systemPrompt', (ctx) => {
						ctx.setPart('Tool guidelines here.');
					});
				},
			],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(capturedContext!.history.systemPrompt).toBe('Tool guidelines here.');

		await runtime.dispose();
	});

	it('registered tools reach the agent at bootstrap', async () => {
		let capturedContext: Context | undefined;
		const system = createCoreStateModule(
			createMockConnector((context) => {
				capturedContext = context;
			}),
		);

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[
				(api) => {
					api.registerTool({
						name: 'my_tool',
						description: 'does things',
						schema: z.object({ x: z.string() }),
						execute: async () => 'ok',
					});
				},
			],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(capturedContext!.tools).toHaveLength(1);
		expect(capturedContext!.tools[0]?.name).toBe('my_tool');

		await runtime.dispose();
	});

	it('multiple systemPrompt handlers compose in registration order', async () => {
		let capturedContext: Context | undefined;
		const system = createCoreStateModule(
			createMockConnector((context) => {
				capturedContext = context;
			}),
		);

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {},
					usage: ZERO_USAGE,
				},
			},
			[
				(api) => {
					api.on('systemPrompt', (ctx) => {
						ctx.setPart('first');
					});
					api.on('systemPrompt', (ctx) => {
						ctx.setPart('second');
					});
				},
			],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(capturedContext!.history.systemPrompt).toBe('first\n\nsecond');

		await runtime.dispose();
	});

	// -------------------------------------------------------------------------
	// Usage accumulation — UsageTracker wired through the session snapshot
	// -------------------------------------------------------------------------

	it('state returns seeded usage when no prompt has run', async () => {
		const seededUsage: Usage = {
			tokens: { input: 50, output: 20, cacheRead: 0, cacheWrite: 0, total: 70 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{
				core: { messages: [], llmConfig: {}, usage: seededUsage },
			},
			[],
		);

		const state = await system.state(runtime).get();
		expect(state.core.usage).toEqual(seededUsage);

		await runtime.dispose();
	});

	it('state accumulates turnEnd usage on top of seeded value', async () => {
		const seeded: Usage = {
			tokens: { input: 50, output: 20, cacheRead: 0, cacheWrite: 0, total: 70 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
		const turnUsage: Usage = {
			tokens: { input: 10, output: 5, cacheRead: 2, cacheWrite: 1, total: 18 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
		const system = createCoreStateModule(
			createMockConnector(undefined, turnUsage),
		);

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: seeded } },
			[],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const state = await system.state(runtime).get();
		expect(state.core.usage.tokens).toEqual({
			input: 60,
			output: 25,
			cacheRead: 2,
			cacheWrite: 1,
			total: 88,
		});

		await runtime.dispose();
	});

	it('state.get returns a usage snapshot copy', async () => {
		const seeded: Usage = {
			tokens: { input: 50, output: 20, cacheRead: 0, cacheWrite: 0, total: 70 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
		const system = createCoreStateModule(createMockConnector());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: seeded } },
			[],
		);

		const first = await system.state(runtime).get();
		first.core.usage.tokens.input = 999;

		const second = await system.state(runtime).get();
		expect(second.core.usage.tokens.input).toBe(50);

		await runtime.dispose();
	});

	it('fork resets usage to ZERO_USAGE while preserving messages', async () => {
		const turnUsage: Usage = {
			tokens: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, total: 15 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
		const system = createCoreStateModule(
			createMockConnector(undefined, turnUsage),
		);

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const forked = await system.state(runtime).fork();
		expect(forked.core.usage).toEqual(ZERO_USAGE);
		expect(forked.core.messages.length).toBeGreaterThan(0);

		const state = await system.state(runtime).get();
		expect(state.core.usage).toEqual(turnUsage);

		await runtime.dispose();
	});

	it('child returns ZERO_USAGE regardless of parent accumulation', async () => {
		const turnUsage: Usage = {
			tokens: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, total: 15 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
		const system = createCoreStateModule(
			createMockConnector(undefined, turnUsage),
		);

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {}, usage: ZERO_USAGE } },
			[],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const childState = await system.state(runtime).child();
		expect(childState.core.usage).toEqual(ZERO_USAGE);

		await runtime.dispose();
	});
});
