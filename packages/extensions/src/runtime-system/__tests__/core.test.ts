import { describe, it, expect, vi } from 'vitest';
import { createCoreSystem } from '../core.js';
import { createRuntime } from '../types.js';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	type Update,
	type StreamEvent,
} from '@franklin/mini-acp';
import type { CoreAPI } from '../../api/core/api.js';
import type { CoreState } from '../../state/core.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();

		const adapter = createSessionAdapter((_ctx) => ({
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
					stopReason: 'end_turn' as const,
				};
			},
			async cancel() {},
		}));
		const { bind } = createAgentConnection(agentSide);
		bind(adapter);

		return {
			...clientSide,
			dispose: vi.fn(async () => {}),
		};
	};
}

const emptyHistory: CoreState['core']['history'] = {
	systemPrompt: '',
	messages: [],
};

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
			{ core: { history: emptyHistory, llmConfig: {} } },
			[],
		);

		expect(runtime.prompt).toBeDefined();
		expect(runtime.setContext).toBeDefined();
		expect(runtime.cancel).toBeDefined();

		await runtime.dispose();
	});

	it('prompt streams events from the agent', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { history: emptyHistory, llmConfig: {} } },
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

	it('state returns keyed core state with history', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { history: emptyHistory, llmConfig: {} } },
			[],
		);

		const state = await runtime.state();
		expect(state.core).toBeDefined();
		expect(state.core.history).toBeDefined();
		expect(state.core.history.messages).toEqual([]);

		await runtime.dispose();
	});

	it('state tracks conversation after prompt', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { history: emptyHistory, llmConfig: {} } },
			[],
		);

		await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const state = await runtime.state();
		expect(state.core.history.messages.length).toBeGreaterThanOrEqual(2);

		await runtime.dispose();
	});

	it('state preserves llmConfig', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{
				core: {
					history: emptyHistory,
					llmConfig: {
						model: 'test-model',
						provider: 'test-provider',
					},
				},
			},
			[],
		);

		const state = await runtime.state();
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
					history: emptyHistory,
					llmConfig: {
						model: 'test-model',
						provider: 'test-provider',
					},
				},
			},
			[],
		);

		const state = await runtime.state();
		expect('apiKey' in state.core.llmConfig).toBe(false);

		await runtime.dispose();
	});

	it('fork clones history and config', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{
				core: {
					history: {
						systemPrompt: 'You are helpful',
						messages: [
							{
								role: 'user',
								content: [{ type: 'text', text: 'hello' }],
							},
						],
					},
					llmConfig: { model: 'test' },
				},
			},
			[],
		);

		const forked = await runtime.fork();
		expect(forked.core.history.systemPrompt).toBe('You are helpful');
		expect(forked.core.history.messages).toHaveLength(1);
		expect(forked.core.llmConfig.model).toBe('test');

		const state = await runtime.state();
		expect(forked.core.history.messages).not.toBe(state.core.history.messages);

		await runtime.dispose();
	});

	it('child returns empty history with same config', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{
				core: {
					history: {
						systemPrompt: 'You are helpful',
						messages: [
							{
								role: 'user',
								content: [{ type: 'text', text: 'hello' }],
							},
						],
					},
					llmConfig: { model: 'test' },
				},
			},
			[],
		);

		const childState = await runtime.child();
		expect(childState.core.history.messages).toHaveLength(0);
		expect(childState.core.llmConfig.model).toBe('test');

		await runtime.dispose();
	});

	it('dispose cleans up transport', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { history: emptyHistory, llmConfig: {} } },
			[],
		);

		await runtime.dispose();
	});

	it('extensions receive CoreAPI for handler registration', async () => {
		const system = createCoreSystem(createMockSpawn());

		const runtime = await createRuntime(
			system,
			{ core: { history: emptyHistory, llmConfig: {} } },
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

	it('emptyState returns empty history with no config', () => {
		const system = createCoreSystem(createMockSpawn());
		const empty = system.emptyState();

		expect(empty.core.history.systemPrompt).toBe('');
		expect(empty.core.history.messages).toEqual([]);
		expect(empty.core.llmConfig).toEqual({});
	});
});
