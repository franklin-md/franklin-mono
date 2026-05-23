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
import { createCoreEventRegistrations } from '../../compile/registrations/index.js';
import { createToolRegistry } from '../../compile/decorators/tool/index.js';
import { emptyToolFilter, type SessionSnapshot } from '../../state.js';

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
		toolFilter: emptyToolFilter(),
	};
}

function stubClient(
	setContext: (patch: ContextPatch) => Promise<void> = async () => {},
): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(setContext),
		async *prompt() {},
		cancel: vi.fn(async () => {}),
	};
}

type CreateStateInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: ReturnType<typeof createCoreRegistry>;
	readonly getRuntime: () => typeof runtime;
};

function createState(input: CreateStateInput) {
	return createAgentState({
		snapshot: input.snapshot,
		registrations: createCoreEventRegistrations(
			input.registrations,
			input.getRuntime,
		),
		toolRegistry: createToolRegistry(input.registrations, input.getRuntime),
	});
}

describe('createAgentState', () => {
	it('syncs registered system prompt changes through the context ledger', async () => {
		const client = stubClient();
		const agentState = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('system');
				});
			}),
			getRuntime: () => runtime,
		});

		await agentState.contextLedger.sync(client);
		await agentState.contextLedger.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'system',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('does not treat absent handlers as a request to clear acknowledged context', async () => {
		const client = stubClient();
		const agentState = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
			getRuntime: () => runtime,
		});
		agentState.contextLedger.apply({ systemPrompt: 'external' });

		await agentState.contextLedger.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'external',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('keeps system prompt changes pending until context sync succeeds', async () => {
		const setContext = vi
			.fn<MiniACPClient['setContext']>()
			.mockRejectedValueOnce(new Error('transient failure'))
			.mockResolvedValueOnce(undefined);
		const client = stubClient(setContext);
		const agentState = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('retryable');
				});
			}),
			getRuntime: () => runtime,
		});

		await expect(agentState.contextLedger.sync(client)).rejects.toThrow(
			'transient failure',
		);
		await agentState.contextLedger.sync(client);

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

	it('keeps hydrated session context pending until context sync succeeds', async () => {
		const client = stubClient();
		const agentState = createState({
			snapshot: {
				messages: [userMessage],
				llmConfig: { provider: 'test-provider', model: 'test-model' },
				usage: ZERO_USAGE,
				toolFilter: emptyToolFilter(),
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

		await agentState.contextLedger.sync(client);

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

	it('retries the same desired context after setContext fails', async () => {
		const setContext = vi
			.fn<MiniACPClient['setContext']>()
			.mockRejectedValueOnce(new Error('transient failure'))
			.mockResolvedValueOnce(undefined);
		const client = stubClient(setContext);
		const agentState = createState({
			snapshot: {
				messages: [userMessage],
				llmConfig: { model: 'test-model' },
				usage: ZERO_USAGE,
				toolFilter: emptyToolFilter(),
			},
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('retryable');
				});
			}),
			getRuntime: () => runtime,
		});

		await expect(agentState.contextLedger.sync(client)).rejects.toThrow(
			'transient failure',
		);
		expect(agentState.getAgentContext()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});

		await agentState.contextLedger.sync(client);

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
		const agentState = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
			getRuntime: () => runtime,
		});
		const assistantMessage = {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'done' }],
		};

		await agentState.contextLedger.sync(client);
		agentState.contextLedger.append(userMessage);
		agentState.contextLedger.append(assistantMessage);
		await agentState.contextLedger.sync(client);

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

	it('does not send a context patch when desired context already matches', async () => {
		const client = stubClient();
		const agentState = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('stable');
				});
			}),
			getRuntime: () => runtime,
		});

		await agentState.contextLedger.sync(client);
		await agentState.contextLedger.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'stable',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('sends only the changed system prompt after initial context sync', async () => {
		let promptText = 'v1';
		const client = stubClient();
		const agentState = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart(promptText);
				});
			}),
			getRuntime: () => runtime,
		});

		await agentState.contextLedger.sync(client);
		promptText = 'v2';
		await agentState.contextLedger.sync(client);

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
