import { describe, expect, it } from 'vitest';
import type { Ctx } from '@franklin/mini-acp';
import { inspectRuntime } from '../inspect.js';
import type { CoreRuntime } from '../runtime/index.js';

function stubRuntime(state: Record<string, unknown>, ctx: Ctx): CoreRuntime {
	return {
		state: {
			get: async () => state,
			fork: async () => ({}) as never,
			child: async () => ({}) as never,
		},
		context: () => ctx,
		dispose: async () => {},
		subscribe: () => () => {},
		prompt: () => {
			throw new Error('not used');
		},
		cancel: async () => {},
		setLLMConfig: async () => {},
	} as unknown as CoreRuntime;
}

describe('inspectRuntime', () => {
	it('replaces the core slot with the full Ctx snapshot', async () => {
		const ctx: Ctx = {
			history: {
				systemPrompt: 'You are helpful.',
				messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
			},
			tools: [
				{
					name: 'my_tool',
					description: 'does things',
					inputSchema: { type: 'object' },
				},
			],
			config: { model: 'test-model', provider: 'test-provider' },
		};

		const dump = await inspectRuntime(
			stubRuntime({ core: { messages: [], llmConfig: {} } }, ctx),
		);

		expect(dump.core).toEqual(ctx);
	});

	it('preserves sibling state slots alongside the replaced core slot', async () => {
		const ctx: Ctx = {
			history: { systemPrompt: '', messages: [] },
			tools: [],
			config: {},
		};

		const dump = await inspectRuntime(
			stubRuntime(
				{
					core: { messages: [], llmConfig: {} },
					todos: { items: ['a', 'b'] },
					status: { state: 'idle' },
				},
				ctx,
			),
		);

		expect(dump).toMatchObject({
			core: ctx,
			todos: { items: ['a', 'b'] },
			status: { state: 'idle' },
		});
	});
});
