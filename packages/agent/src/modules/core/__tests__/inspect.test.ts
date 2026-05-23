import { describe, expect, it } from 'vitest';
import type { Context } from '@franklin/mini-acp';
import { inspectRuntime } from '../inspect.js';
import { createAgentState } from '../agent-state/index.js';
import { attachAgentState } from '../runtime/agent-state.js';
import type { CoreRuntime } from '../runtime/index.js';
import { emptySessionSnapshot } from '../state.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../compile/decorators/__tests__/registry.js';
import { createToolRegistry } from '../compile/decorators/tool/index.js';

function stubRuntime(context: Context): CoreRuntime {
	const getRuntime = createTestRuntime;
	const registrations = createCoreRegistry(undefined, getRuntime);
	const agentState = createAgentState({
		snapshot: emptySessionSnapshot(),
		registrations,
		toolRegistry: createToolRegistry(registrations),
	});
	agentState.contextLedger.apply(context);
	return attachAgentState(
		{
			getSession: () => agentState.getSnapshot(),
			dispose: async () => {},
			prompt: () => {
				throw new Error('not used');
			},
			cancel: async () => {},
			setLLMConfig: async () => {},
		} as unknown as CoreRuntime,
		agentState,
	);
}

describe('inspectRuntime', () => {
	it('replaces the core slot with the full Context snapshot', async () => {
		const context: Context = {
			systemPrompt: 'You are helpful.',
			messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
			tools: [
				{
					name: 'my_tool',
					description: 'does things',
					inputSchema: { type: 'object' },
				},
			],
			config: { model: 'test-model', provider: 'test-provider' },
		};

		const dump = await inspectRuntime(stubRuntime(context));

		expect(dump.core).toEqual(context);
	});

	it('redacts apiKey from the inspected config snapshot', async () => {
		const context: Context = {
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {
				model: 'test-model',
				provider: 'test-provider',
				reasoning: 'high',
				apiKey: 'sk-secret',
			},
		};

		const dump = await inspectRuntime(stubRuntime(context));

		expect(dump.core.config).toEqual({
			model: 'test-model',
			provider: 'test-provider',
			reasoning: 'high',
		});
		expect('apiKey' in dump.core.config).toBe(false);
	});

	it('returns only the core inspection payload', async () => {
		const context: Context = {
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		};

		await expect(inspectRuntime(stubRuntime(context))).resolves.toEqual({
			core: context,
		});
	});
});
