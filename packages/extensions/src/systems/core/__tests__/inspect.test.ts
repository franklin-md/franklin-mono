import { describe, expect, it } from 'vitest';
import type { Ctx } from '@franklin/mini-acp';
import { inspectRuntime } from '../inspect.js';
import type { CoreRuntime } from '../runtime/index.js';
import type { StateHandle } from '../../../algebra/runtime/index.js';
import type { CoreState } from '../state.js';

function stubRuntime(ctx: Ctx): CoreRuntime {
	return {
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

function stubState<S extends CoreState>(state: S): StateHandle<S> {
	return {
		get: async () => state,
		fork: async () => ({}) as never,
		child: async () => ({}) as never,
	};
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
			stubRuntime(ctx),
			stubState({
				core: { messages: [], llmConfig: {} },
			} as unknown as CoreState),
		);

		expect(dump.core).toEqual(ctx);
	});

	it('redacts apiKey from the inspected config snapshot', async () => {
		const ctx: Ctx = {
			history: { systemPrompt: '', messages: [] },
			tools: [],
			config: {
				model: 'test-model',
				provider: 'test-provider',
				reasoning: 'high',
				apiKey: 'sk-secret',
			},
		};

		const dump = await inspectRuntime(
			stubRuntime(ctx),
			stubState({
				core: { messages: [], llmConfig: {} },
			} as unknown as CoreState),
		);

		expect(dump.core.config).toEqual({
			model: 'test-model',
			provider: 'test-provider',
			reasoning: 'high',
		});
		expect('apiKey' in dump.core.config).toBe(false);
	});

	it('preserves sibling state slots alongside the replaced core slot', async () => {
		const ctx: Ctx = {
			history: { systemPrompt: '', messages: [] },
			tools: [],
			config: {},
		};

		const dump = await inspectRuntime(
			stubRuntime(ctx),
			stubState({
				core: { messages: [], llmConfig: {} },
				todos: { items: ['a', 'b'] },
				status: { state: 'idle' },
			} as unknown as CoreState),
		);

		expect(dump).toMatchObject({
			core: ctx,
			todos: { items: ['a', 'b'] },
			status: { state: 'idle' },
		});
	});
});
