import { describe, expect, it } from 'vitest';

import {
	createAssistantMessageEventStream,
	type AssistantMessage,
	type Message as PiMessage,
	type Model,
	type ToolCall,
} from '@earendil-works/pi-ai';
import type { StreamFn } from '@earendil-works/pi-agent-core';

import { createPiAgent } from '../backend/pi/agent.js';
import type { MiniACPAgent, MiniACPClient } from '../protocol/index.js';
import { StopCode } from '../types/stop-code.js';
import type { ToolDefinition } from '../types/tool.js';
import { collect } from '../utils/collect.js';

const ZERO_PI_USAGE = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} as const;

const openVaultTool: ToolDefinition = {
	name: 'open_vault',
	description: 'Open the vault before money can be retrieved.',
	inputSchema: { type: 'object' },
};

const getMoneyTool: ToolDefinition = {
	name: 'get_money',
	description: 'Retrieve money from an open vault.',
	inputSchema: { type: 'object' },
};

type DoneReason = 'stop' | 'toolUse';

function assistantMessage(
	model: Model<string>,
	content: AssistantMessage['content'],
	stopReason: DoneReason,
): AssistantMessage {
	return {
		role: 'assistant',
		content,
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: ZERO_PI_USAGE,
		stopReason,
		timestamp: Date.now(),
	};
}

function toolCall(name: string): ToolCall {
	return {
		type: 'toolCall',
		id: `call-${name}`,
		name,
		arguments: {},
	};
}

function streamDone(message: AssistantMessage, reason: DoneReason) {
	const stream = createAssistantMessageEventStream();
	queueMicrotask(() => {
		stream.push({ type: 'done', reason, message });
	});
	return stream;
}

function piUserTexts(messages: PiMessage[]): string[] {
	return messages.flatMap((message) => {
		if (message.role !== 'user') return [];
		if (typeof message.content === 'string') return [message.content];
		return message.content.flatMap((content) =>
			content.type === 'text' ? [content.text] : [],
		);
	});
}

describe('Pi setContext during an active Mini-ACP turn', () => {
	it.fails(
		'makes tools registered by one tool call available to the next Pi LLM call',
		async () => {
			const clientRef: { current?: MiniACPClient } = {};
			const toolExecutions: string[] = [];
			const toolsSeenByLlm: string[][] = [];

			const streamFn: StreamFn = (model, context) => {
				const toolNames = (context.tools ?? []).map((tool) => tool.name);
				toolsSeenByLlm.push(toolNames);

				if (toolsSeenByLlm.length === 1) {
					return streamDone(
						assistantMessage(model, [toolCall('open_vault')], 'toolUse'),
						'toolUse',
					);
				}

				if (toolsSeenByLlm.length === 2 && toolNames.includes('get_money')) {
					return streamDone(
						assistantMessage(model, [toolCall('get_money')], 'toolUse'),
						'toolUse',
					);
				}

				const text = toolExecutions.includes('get_money')
					? 'retrieved $100 from the vault'
					: 'get_money was unavailable';
				return streamDone(
					assistantMessage(model, [{ type: 'text', text }], 'stop'),
					'stop',
				);
			};

			const server: MiniACPAgent = {
				toolExecute: async ({ call }) => {
					toolExecutions.push(call.name);
					if (call.name === 'open_vault') {
						const client = clientRef.current;
						if (!client) throw new Error('client not initialized');
						await client.setContext({ tools: [openVaultTool, getMoneyTool] });
						return {
							toolCallId: call.id,
							content: [{ type: 'text', text: 'vault opened' }],
						};
					}
					if (call.name === 'get_money') {
						return {
							toolCallId: call.id,
							content: [{ type: 'text', text: '$100' }],
						};
					}
					return {
						toolCallId: call.id,
						isError: true,
						content: [{ type: 'text', text: `unknown tool: ${call.name}` }],
					};
				},
			};

			const client = createPiAgent(server, { streamFn });
			clientRef.current = client;
			await client.initialize();
			await client.setContext({
				tools: [openVaultTool],
				config: {
					provider: 'openrouter',
					model: 'openrouter/free',
					apiKey: 'sk-test-key',
				},
			});

			const result = await collect(
				client.prompt({
					role: 'user',
					content: [
						{ type: 'text', text: 'Open the vault and get the money.' },
					],
				}),
			);

			expect(toolsSeenByLlm[0]).toEqual(['open_vault']);
			expect(toolsSeenByLlm[1]).toEqual(['open_vault', 'get_money']);
			expect(toolExecutions).toEqual(['open_vault', 'get_money']);
			expect(result.messages.at(-1)).toEqual({
				role: 'assistant',
				content: [{ type: 'text', text: 'retrieved $100 from the vault' }],
			});
			expect(result.turnEnd?.stopCode).toBe(StopCode.Finished);
		},
	);

	it.fails(
		'defers system prompt, messages, and config changes until the next Mini-ACP prompt',
		async () => {
			const clientRef: { current?: MiniACPClient } = {};
			const toolExecutions: string[] = [];
			const observations: Array<{
				model: string;
				reasoning: string | undefined;
				systemPrompt: string | undefined;
				toolNames: string[];
				userTexts: string[];
			}> = [];

			const streamFn: StreamFn = (model, context, options) => {
				observations.push({
					model: model.id,
					reasoning: options?.reasoning,
					systemPrompt: context.systemPrompt,
					toolNames: (context.tools ?? []).map((tool) => tool.name),
					userTexts: piUserTexts(context.messages),
				});

				if (observations.length === 1) {
					return streamDone(
						assistantMessage(model, [toolCall('open_vault')], 'toolUse'),
						'toolUse',
					);
				}

				return streamDone(
					assistantMessage(
						model,
						[{ type: 'text', text: `done-${observations.length}` }],
						'stop',
					),
					'stop',
				);
			};

			const server: MiniACPAgent = {
				toolExecute: async ({ call }) => {
					toolExecutions.push(call.name);
					if (call.name !== 'open_vault') {
						return {
							toolCallId: call.id,
							isError: true,
							content: [
								{ type: 'text', text: `unexpected tool: ${call.name}` },
							],
						};
					}
					const client = clientRef.current;
					if (!client) throw new Error('client not initialized');
					await client.setContext({
						systemPrompt: 'deferred system',
						messages: [
							{
								role: 'user',
								content: [{ type: 'text', text: 'deferred history' }],
							},
						],
						tools: [openVaultTool, getMoneyTool],
						config: {
							provider: 'openai-codex',
							model: 'gpt-5.4-mini',
							apiKey: 'deferred-key',
							reasoning: 'high',
						},
					});
					return {
						toolCallId: call.id,
						content: [{ type: 'text', text: 'vault opened' }],
					};
				},
			};

			const client = createPiAgent(server, { streamFn });
			clientRef.current = client;
			await client.initialize();
			await client.setContext({
				systemPrompt: 'initial system',
				messages: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'seed history' }],
					},
				],
				tools: [openVaultTool],
				config: {
					provider: 'openrouter',
					model: 'openrouter/free',
					apiKey: 'initial-key',
					reasoning: 'low',
				},
			});

			await collect(
				client.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'first prompt' }],
				}),
			);
			await collect(
				client.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'second prompt' }],
				}),
			);

			expect(toolExecutions).toEqual(['open_vault']);
			expect(observations).toHaveLength(3);
			expect(observations[0]).toMatchObject({
				model: 'openrouter/free',
				reasoning: 'low',
				systemPrompt: 'initial system',
				toolNames: ['open_vault'],
			});
			expect(observations[0]?.userTexts).toEqual(
				expect.arrayContaining(['seed history', 'first prompt']),
			);
			expect(observations[0]?.userTexts).not.toContain('deferred history');
			expect(observations[1]).toMatchObject({
				model: 'openrouter/free',
				reasoning: 'low',
				systemPrompt: 'initial system',
				toolNames: ['open_vault', 'get_money'],
			});
			expect(observations[1]?.userTexts).not.toContain('deferred history');
			expect(observations[2]).toMatchObject({
				model: 'gpt-5.4-mini',
				reasoning: 'high',
				systemPrompt: 'deferred system',
				toolNames: ['open_vault', 'get_money'],
			});
			expect(observations[2]?.userTexts).toEqual(
				expect.arrayContaining(['deferred history', 'second prompt']),
			);
			expect(observations[2]?.userTexts).not.toContain('first prompt');
		},
	);
});
