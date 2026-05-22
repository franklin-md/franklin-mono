import type {
	ContextPatch,
	MiniACPClient,
	UserMessage,
} from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAgentState } from '../create.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../compile/decorators/__tests__/registry.js';
import type { SessionSnapshot } from '../../state.js';

const runtime = createTestRuntime();

const userMessage: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'remembered' }],
};

function emptySnapshot(): SessionSnapshot {
	return {
		messages: [],
		llmConfig: {},
		usage: ZERO_USAGE,
	};
}

function stubClient(
	setContext: (patch: ContextPatch) => Promise<void> = async () => {},
): Pick<MiniACPClient, 'setContext'> {
	return {
		setContext: vi.fn(setContext),
	};
}

describe('createAgentState', () => {
	it('syncs registered system prompt changes through the prompt-context ledger', async () => {
		const client = stubClient();
		const agentState = createAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('system');
				});
			}),
			getRuntime: () => runtime,
		});

		await agentState.promptContext.sync(client);
		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'system',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('does not treat absent handlers as a request to clear acknowledged prompt context', async () => {
		const client = stubClient();
		const agentState = createAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
			getRuntime: () => runtime,
		});
		agentState.promptContext.apply({ systemPrompt: 'external' });

		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'external',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('keeps system prompt changes pending until prompt context sync succeeds', async () => {
		const setContext = vi
			.fn<MiniACPClient['setContext']>()
			.mockRejectedValueOnce(new Error('transient failure'))
			.mockResolvedValueOnce(undefined);
		const client = stubClient(setContext);
		const agentState = createAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('retryable');
				});
			}),
			getRuntime: () => runtime,
		});

		await expect(agentState.promptContext.sync(client)).rejects.toThrow(
			'transient failure',
		);
		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenNthCalledWith(1, {
			systemPrompt: 'retryable',
			messages: [],
			tools: [],
			config: {},
		});
		expect(client.setContext).toHaveBeenNthCalledWith(2, {
			systemPrompt: 'retryable',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('keeps hydrated session context pending until prompt context sync succeeds', async () => {
		const client = stubClient();
		const agentState = createAgentState({
			snapshot: {
				messages: [userMessage],
				llmConfig: { provider: 'test-provider', model: 'test-model' },
				usage: ZERO_USAGE,
			},
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('system');
				});
				api.registerTool(
					{
						name: 'lookup',
						description: 'Lookup a value',
						schema: z.object({ query: z.string() }),
					},
					{
						execute: () => 'ok',
					},
				);
			}),
			getRuntime: () => runtime,
		});

		expect(agentState.getAgentContext()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});
		expect(agentState.getSnapshot()).toMatchObject({
			messages: [userMessage],
			llmConfig: { model: 'test-model' },
		});

		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenCalledWith({
			systemPrompt: 'system',
			messages: [userMessage],
			tools: [
				expect.objectContaining({
					name: 'lookup',
					description: 'Lookup a value',
				}),
			],
			config: { provider: 'test-provider', model: 'test-model' },
		});
		expect(agentState.getAgentContext()).toMatchObject({
			systemPrompt: 'system',
			messages: [userMessage],
			config: { provider: 'test-provider', model: 'test-model' },
		});
		expect(agentState.getAgentContext().tools).toHaveLength(1);
	});

	it('retries the same desired prompt context after setContext fails', async () => {
		const setContext = vi
			.fn<MiniACPClient['setContext']>()
			.mockRejectedValueOnce(new Error('transient failure'))
			.mockResolvedValueOnce(undefined);
		const client = stubClient(setContext);
		const agentState = createAgentState({
			snapshot: {
				messages: [userMessage],
				llmConfig: { model: 'test-model' },
				usage: ZERO_USAGE,
			},
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('retryable');
				});
			}),
			getRuntime: () => runtime,
		});

		await expect(agentState.promptContext.sync(client)).rejects.toThrow(
			'transient failure',
		);
		expect(agentState.getAgentContext()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});

		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenCalledTimes(2);
		expect(client.setContext).toHaveBeenNthCalledWith(1, {
			systemPrompt: 'retryable',
			messages: [userMessage],
			tools: [],
			config: { model: 'test-model' },
		});
		expect(client.setContext).toHaveBeenNthCalledWith(2, {
			systemPrompt: 'retryable',
			messages: [userMessage],
			tools: [],
			config: { model: 'test-model' },
		});
		expect(agentState.getAgentContext().systemPrompt).toBe('retryable');
	});

	it('does not resend messages that were already tracked through the prompt stream', async () => {
		const client = stubClient();
		const agentState = createAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
			getRuntime: () => runtime,
		});
		const assistantMessage = {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'done' }],
		};

		await agentState.promptContext.sync(client);
		agentState.promptContext.append(userMessage);
		agentState.promptContext.append(assistantMessage);
		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});
		expect(agentState.getSnapshot().messages).toEqual([
			userMessage,
			assistantMessage,
		]);
	});

	it('does not send a prompt context patch when desired context already matches', async () => {
		const client = stubClient();
		const agentState = createAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('stable');
				});
			}),
			getRuntime: () => runtime,
		});

		await agentState.promptContext.sync(client);
		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'stable',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('sends only the changed system prompt after initial prompt context sync', async () => {
		let promptText = 'v1';
		const client = stubClient();
		const agentState = createAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart(promptText);
				});
			}),
			getRuntime: () => runtime,
		});

		await agentState.promptContext.sync(client);
		promptText = 'v2';
		await agentState.promptContext.sync(client);

		expect(client.setContext).toHaveBeenNthCalledWith(1, {
			systemPrompt: 'v1',
			messages: [],
			tools: [],
			config: {},
		});
		expect(client.setContext).toHaveBeenNthCalledWith(2, {
			systemPrompt: 'v2',
		});
	});
});
