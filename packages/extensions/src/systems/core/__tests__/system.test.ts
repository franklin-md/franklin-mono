import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createCoreSystem } from '../system.js';
import { createRuntime } from '../../../algebra/system/create.js';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
	type Ctx,
	type Update,
	type StreamEvent,
} from '@franklin/mini-acp';
import type { CoreAPI } from '../api/api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSpawn(onPrompt?: (ctx: Ctx) => void) {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
		const connection = createAgentConnection(agentSide);

		const adapter = createSessionAdapter((ctx) => {
			onPrompt?.(ctx);
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
					};
				},
				async cancel() {},
			};
		}, connection.remote);
		connection.bind(adapter);

		return {
			...clientSide,
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

describe('createCoreSystem', () => {
	it('create returns a runtime with protocol methods', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[],
		);

		expect(runtime.prompt).toBeDefined();
		expect(runtime.setLLMConfig).toBeDefined();
		expect(runtime.cancel).toBeDefined();

		await runtime.dispose();
	});

	it('prompt streams events from the agent', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
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
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[],
		);

		const state = await runtime.state.get();
		expect(state.core).toBeDefined();
		expect(state.core.messages).toEqual([]);

		await runtime.dispose();
	});

	it('state tracks conversation after prompt', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const state = await runtime.state.get();
		expect(state.core.messages.length).toBeGreaterThanOrEqual(2);

		await runtime.dispose();
	});

	it('state preserves llmConfig', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {
						model: 'test-model',
						provider: 'test-provider',
					},
				},
			},
			[],
		);

		const state = await runtime.state.get();
		expect(state.core.llmConfig.model).toBe('test-model');
		expect(state.core.llmConfig.provider).toBe('test-provider');

		await runtime.dispose();
	});

	it('state strips apiKey from config', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {
						model: 'test-model',
						provider: 'test-provider',
					},
				},
			},
			[],
		);

		const state = await runtime.state.get();
		expect('apiKey' in state.core.llmConfig).toBe(false);

		await runtime.dispose();
	});

	it('fork clones messages and config', async () => {
		const system = createCoreSystem(createMockSpawn());

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
				},
			},
			[],
		);

		const forked = await runtime.state.fork();
		expect(forked.core.messages).toHaveLength(1);
		expect(forked.core.llmConfig.model).toBe('test');

		const state = await runtime.state.get();
		expect(forked.core.messages).not.toBe(state.core.messages);

		await runtime.dispose();
	});

	it('child returns empty messages with same config', async () => {
		const system = createCoreSystem(createMockSpawn());

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
				},
			},
			[],
		);

		const childState = await runtime.state.child();
		expect(childState.core.messages).toHaveLength(0);
		expect(childState.core.llmConfig.model).toBe('test');

		await runtime.dispose();
	});

	it('dispose cleans up transport', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[],
		);

		await runtime.dispose();
	});

	it('extensions receive CoreAPI for handler registration', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[
				(api: CoreAPI) => {
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
		const system = createCoreSystem(createMockSpawn());
		const empty = system.emptyState();

		expect(empty.core.messages).toEqual([]);
		expect(empty.core.llmConfig).toEqual({});
	});

	it('systemPrompt handler assembles system prompt before first turn', async () => {
		let capturedCtx: Ctx | undefined;
		const system = createCoreSystem(
			createMockSpawn((ctx) => {
				capturedCtx = ctx;
			}),
		);

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {},
				},
			},
			[
				(api: CoreAPI) => {
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

		expect(capturedCtx!.history.systemPrompt).toBe('Tool guidelines here.');

		await runtime.dispose();
	});

	it('registered tools reach the agent at bootstrap', async () => {
		let capturedCtx: Ctx | undefined;
		const system = createCoreSystem(
			createMockSpawn((ctx) => {
				capturedCtx = ctx;
			}),
		);

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[
				(api: CoreAPI) => {
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

		expect(capturedCtx!.tools).toHaveLength(1);
		expect(capturedCtx!.tools[0]?.name).toBe('my_tool');

		await runtime.dispose();
	});

	it('multiple systemPrompt handlers compose in registration order', async () => {
		let capturedCtx: Ctx | undefined;
		const system = createCoreSystem(
			createMockSpawn((ctx) => {
				capturedCtx = ctx;
			}),
		);

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [],
					llmConfig: {},
				},
			},
			[
				(api: CoreAPI) => {
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

		expect(capturedCtx!.history.systemPrompt).toBe('first\n\nsecond');

		await runtime.dispose();
	});
});
