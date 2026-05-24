import type {
	ContextPatch,
	MiniACPClient,
	UserMessage,
} from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import { emptyToolFilter, type SessionSnapshot } from '../../state.js';
import type { CoreRegistry } from '../../registrations/index.js';
import { createToolRegistry } from '../../tools/index.js';
import { createAgentSession } from '../session.js';

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
	readonly registrations: CoreRegistry;
};

function createState(input: CreateStateInput) {
	return createAgentSession({
		snapshot: input.snapshot,
		registrations: input.registrations,
		toolRegistry: createToolRegistry(input.registrations.tools),
	});
}

describe('createAgentSession', () => {
	it('syncs registered system prompt changes through the context ledger', async () => {
		const client = stubClient();
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('system');
					});
				},
				() => runtime,
			),
		});

		await session.sync(client);
		await session.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: 'system',
			messages: [],
			tools: [],
			config: {},
		});
	});

	it('keeps runtime-only context out of the session snapshot', async () => {
		const client = stubClient();
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(
				(api) => {
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
				},
				() => runtime,
			),
		});

		await session.sync(client);

		expect(session.getSnapshot()).toEqual({
			messages: [],
			llmConfig: {},
			usage: ZERO_USAGE,
			toolFilter: { disabled: [] },
		});
		expect(session.getSentContext().systemPrompt).toBe('system');
		expect(session.getSentContext().tools).toHaveLength(1);
	});

	it('keeps snapshot projection on the session API', () => {
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
		});

		expect(session.getSnapshot()).toEqual(emptySnapshot());
		expect(session).not.toHaveProperty('ledger');
		expect(session).not.toHaveProperty('recorder');
		expect(session).not.toHaveProperty('usage');
	});

	it('does not treat absent handlers as a request to clear sent context', async () => {
		const client = stubClient();
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
		});
		session.recordContext({ systemPrompt: 'external' });

		await session.sync(client);

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
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('retryable');
					});
				},
				() => runtime,
			),
		});

		await expect(session.sync(client)).rejects.toThrow('transient failure');
		await session.sync(client);

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
		const session = createState({
			snapshot: {
				messages: [userMessage],
				llmConfig: { provider: 'test-provider', model: 'test-model' },
				usage: ZERO_USAGE,
				toolFilter: emptyToolFilter(),
			},
			registrations: createCoreRegistry(
				(api) => {
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
				},
				() => runtime,
			),
		});

		expect(session.getSentContext()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});
		expect(session.getSnapshot()).toMatchObject({
			messages: [userMessage],
			llmConfig: { model: 'test-model' },
		});

		await session.sync(client);

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
		expect(session.getSentContext()).toMatchObject({
			systemPrompt: 'system',
			messages: [userMessage],
			config: { provider: 'test-provider', model: 'test-model' },
		});
		expect(session.getSentContext().tools).toHaveLength(1);
	});

	it('retries the same desired context after setContext fails', async () => {
		const setContext = vi
			.fn<MiniACPClient['setContext']>()
			.mockRejectedValueOnce(new Error('transient failure'))
			.mockResolvedValueOnce(undefined);
		const client = stubClient(setContext);
		const session = createState({
			snapshot: {
				messages: [userMessage],
				llmConfig: { model: 'test-model' },
				usage: ZERO_USAGE,
				toolFilter: emptyToolFilter(),
			},
			registrations: createCoreRegistry(
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('retryable');
					});
				},
				() => runtime,
			),
		});

		await expect(session.sync(client)).rejects.toThrow('transient failure');
		expect(session.getSentContext()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});

		await session.sync(client);

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
		expect(session.getSentContext().systemPrompt).toBe('retryable');
	});

	it('does not resend messages that were already tracked through the prompt stream', async () => {
		const client = stubClient();
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
		});
		const assistantMessage = {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'done' }],
		};

		await session.sync(client);
		session.recordMessage(userMessage);
		session.recordMessage(assistantMessage);
		await session.sync(client);

		expect(client.setContext).toHaveBeenCalledExactlyOnceWith({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});
		expect(session.getSnapshot().messages).toEqual([
			userMessage,
			assistantMessage,
		]);
	});

	it('does not send a context patch when desired context already matches', async () => {
		const client = stubClient();
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('stable');
					});
				},
				() => runtime,
			),
		});

		await session.sync(client);
		await session.sync(client);

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
		const session = createState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart(promptText);
					});
				},
				() => runtime,
			),
		});

		await session.sync(client);
		promptText = 'v2';
		await session.sync(client);

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
