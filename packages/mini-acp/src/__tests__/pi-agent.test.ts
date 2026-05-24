import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ToolExecuteParams } from '../types/tool.js';

const agentInstances: Array<{
	subscribe: ReturnType<typeof vi.fn>;
	prompt: ReturnType<typeof vi.fn>;
	abort: ReturnType<typeof vi.fn>;
	state: {
		systemPrompt: string;
		messages: unknown[];
		tools: unknown[];
	};
}> = [];
const agentConstructor = vi.fn();
let promptImplementation: () => Promise<void> = async () => {};

vi.mock('@earendil-works/pi-agent-core', () => ({
	Agent: class {
		readonly subscribe = vi.fn(() => () => {});
		readonly prompt = vi.fn(() => promptImplementation());
		readonly abort = vi.fn();
		readonly state: {
			systemPrompt: string;
			messages: unknown[];
			tools: unknown[];
		};

		constructor(options: {
			initialState?: {
				systemPrompt?: string;
				messages?: unknown[];
				tools?: unknown[];
			};
		}) {
			this.state = {
				systemPrompt: options.initialState?.systemPrompt ?? '',
				messages: options.initialState?.messages ?? [],
				tools: options.initialState?.tools ?? [],
			};
			agentConstructor(options);
			agentInstances.push(this);
		}
	},
}));

import { createPiAgent } from '../backend/pi/agent.js';

describe('createPiAgent', () => {
	beforeEach(() => {
		agentConstructor.mockReset();
		agentInstances.length = 0;
		promptImplementation = async () => {};
	});

	it('returns a Mini-ACP client', () => {
		const client = createPiAgent({
			toolExecute: vi.fn(async (_params: ToolExecuteParams) => ({
				toolCallId: 'tool-1',
				content: [],
			})),
		});

		expect(client.initialize).toEqual(expect.any(Function));
		expect(client.setContext).toEqual(expect.any(Function));
		expect(client.prompt).toEqual(expect.any(Function));
		expect(client.cancel).toEqual(expect.any(Function));
	});

	it('creates Pi core agents with the current context and options', async () => {
		const streamFn = vi.fn();
		const server = {
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'ok' }],
			})),
		};
		const client = createPiAgent(server, { streamFn });
		const tool = {
			name: 'echo',
			description: 'Echo input',
			inputSchema: { type: 'object' },
		};

		await client.initialize();
		await client.setContext({
			systemPrompt: 'system prompt',
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: 'seed' }],
				},
			],
			tools: [tool],
			config: {
				provider: 'openai-codex',
				model: 'gpt-5.4',
				apiKey: 'oauth-token',
			},
		});

		for await (const _event of client.prompt({
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		})) {
			// The mocked Pi core agent emits no stream events.
		}

		expect(agentConstructor).toHaveBeenCalledOnce();
		const [options] = agentConstructor.mock.calls[0] ?? [];
		expect(options).toMatchObject({
			initialState: {
				systemPrompt: 'system prompt',
				tools: [expect.objectContaining({ name: 'echo' })],
				messages: [
					expect.objectContaining({
						role: 'user',
						content: [{ type: 'text', text: 'seed' }],
					}),
				],
			},
			streamFn,
		});
		const getApiKey = (
			options as { getApiKey?: (provider: string) => string | undefined }
		).getApiKey;
		expect(getApiKey).toBeDefined();
		expect(getApiKey?.('openai-codex')).toBe('oauth-token');
		expect((options as { prepareNextTurn?: unknown }).prepareNextTurn).toEqual(
			expect.any(Function),
		);
	});

	it('cancels the active Pi core agent', async () => {
		let resolvePrompt: (() => void) | undefined;
		promptImplementation = () =>
			new Promise<void>((resolve) => {
				resolvePrompt = resolve;
			});
		const client = createPiAgent({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [],
			})),
		});
		await client.setContext({
			config: {
				provider: 'openai-codex',
				model: 'gpt-5.4',
				apiKey: 'oauth-token',
			},
		});

		const iterator = client
			.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			})
			[Symbol.asyncIterator]();
		const next = iterator.next();
		await vi.waitFor(() => expect(agentInstances).toHaveLength(1));
		await client.cancel();

		expect(agentInstances[0]?.abort).toHaveBeenCalledOnce();
		resolvePrompt?.();
		await next;
	});
});
