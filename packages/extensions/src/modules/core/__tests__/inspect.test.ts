import { describe, expect, it } from 'vitest';
import type { Context } from '@franklin/mini-acp';
import { inspectRuntime } from '../inspect.js';
import type { CoreRuntime } from '../runtime/index.js';
import type { StateHandle } from '../../../algebra/modules/state/index.js';
import type { CoreState } from '../state.js';

function stubRuntime(context: Context): CoreRuntime {
	return {
		context: () => context,
		dispose: async () => {},
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
	it('replaces the core slot with the full Context snapshot', async () => {
		const context: Context = {
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
			stubRuntime(context),
			stubState({
				core: { messages: [], llmConfig: {} },
			} as unknown as CoreState),
		);

		expect(dump.core).toEqual(context);
	});

	it('redacts apiKey from the inspected config snapshot', async () => {
		const context: Context = {
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
			stubRuntime(context),
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
		const context: Context = {
			history: { systemPrompt: '', messages: [] },
			tools: [],
			config: {},
		};

		const dump = await inspectRuntime(
			stubRuntime(context),
			stubState({
				core: { messages: [], llmConfig: {} },
				todos: { items: ['a', 'b'] },
				status: { state: 'idle' },
			} as unknown as CoreState),
		);

		expect(dump).toMatchObject({
			core: context,
			todos: { items: ['a', 'b'] },
			status: { state: 'idle' },
		});
	});
});
