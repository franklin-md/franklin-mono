import { collectEvents } from './utils/collect-events.js';
import { describe, expect, it } from 'vitest';
import { createPiAgent } from '../backend/pi/agent.js';
import { collect } from '../utils/collect.js';
import { StopCode } from '../types/stop-code.js';
import { createScriptedProvider } from '../mock/provider.js';
import type { LLMConfig } from '../types/context.js';
import type { UserMessage } from '../types/message.js';

const prompt: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'hello' }],
};
const config: LLMConfig = {
	provider: 'openrouter',
	model: 'openrouter/free',
	apiKey: 'stub-key',
};
const tool = {
	name: 'echo',
	description: 'Echo',
	inputSchema: { type: 'object' },
};
const call = {
	type: 'toolCall' as const,
	id: 'c1',
	name: 'echo',
	arguments: {},
};
const server = { toolExecute: async () => ({ toolCallId: 'c1', content: [] }) };

describe('Pi explicit drives', () => {
	it('makes one request per drive, retaining reasoning, tool results and exactly one user message', async () => {
		const provider = createScriptedProvider([
			{
				content: [
					{ type: 'thinking', thinking: 'reasoning' },
					{ type: 'text', text: 'looking' },
					call,
				],
				stopReason: 'toolUse',
			},
			{ content: [call], stopReason: 'toolUse' },
			{},
			{},
		]);
		const client = createPiAgent(server, provider);
		await client.initialize();
		await client.setContext({ config, tools: [tool] });
		const first = await collect(client.prompt(prompt));
		expect(provider.requests).toHaveLength(1);
		expect(first.stepEnd?.stepUsage?.tokens.total).toBe(16);
		expect(first.turnEnd).toBeUndefined();
		expect(first.messages[0]?.content).toEqual([
			{ type: 'thinking', text: 'reasoning' },
			{ type: 'text', text: 'looking' },
		]);
		const second = await collect(client.continue());
		expect(provider.requests).toHaveLength(2);
		expect(second.stepEnd).toBeDefined();
		const third = await collect(client.continue());
		expect(provider.requests).toHaveLength(3);
		expect(third.stepEnd).toBeUndefined();
		expect(third.turnEnd).toMatchObject({
			stopCode: StopCode.Finished,
			stepUsage: { tokens: { total: 16 } },
			usage: { tokens: { total: 48 }, cost: { total: 30 } },
		});
		expect(
			provider.requests[2]?.messages.filter((m) => m.role === 'user'),
		).toHaveLength(1);
		expect(
			provider.requests[2]?.messages.filter((m) => m.role === 'toolResult'),
		).toHaveLength(2);
		expect(await collect(client.continue())).toEqual({
			messages: [],
			stepEnd: undefined,
			turnEnd: undefined,
		});
		expect(provider.requests).toHaveLength(3);
		const next = await collect(client.prompt(prompt));
		expect(next.turnEnd?.usage?.tokens.total).toBe(16);
		expect(
			provider.requests[3]?.messages.filter((m) => m.role === 'user'),
		).toHaveLength(2);
	});

	it.each([
		['stop', StopCode.Finished],
		['toolUse', StopCode.Finished],
		['length', StopCode.MaxTokens],
		['error', StopCode.AuthKeyInvalid],
		['aborted', StopCode.Cancelled],
	] as const)(
		'ends %s with one turnEnd and no stepEnd',
		async (stopReason, stopCode) => {
			const provider = createScriptedProvider([
				{
					stopReason,
					errorMessage:
						stopReason === 'error' ? '401 Invalid API key' : undefined,
				},
			]);
			const client = createPiAgent(server, provider);
			await client.setContext({ config });
			const events = await collectEvents(client.prompt(prompt));
			expect(
				events.filter((e) => e.type === 'stepEnd' || e.type === 'turnEnd'),
			).toEqual([expect.objectContaining({ type: 'turnEnd', stopCode })]);
			expect(await collectEvents(client.continue())).toEqual([]);
			expect(provider.requests).toHaveLength(1);
		},
	);

	it.each([
		[{}, StopCode.ProviderNotSpecified],
		[{ provider: 'unknown' }, StopCode.ProviderNotFound],
		[{ provider: 'openrouter' }, StopCode.ModelNotSpecified],
		[
			{ provider: 'openrouter', model: 'no-such-model' },
			StopCode.ModelNotFound,
		],
		[
			{ provider: 'openrouter', model: 'openrouter/free' },
			StopCode.AuthKeyNotSpecified,
		],
	] as const)(
		'ends unresolved config without requesting a provider',
		async (badConfig, stopCode) => {
			const provider = createScriptedProvider([]);
			const client = createPiAgent(server, provider);
			await client.setContext({ config: badConfig });
			const events = await collectEvents(client.prompt(prompt));
			expect(events).toEqual([
				{ type: 'turnStart' },
				expect.objectContaining({ type: 'turnEnd', stopCode }),
			]);
			await client.setContext({ systemPrompt: 'immediately idle' });
			expect(await collectEvents(client.continue())).toEqual([]);
			expect(provider.requests).toHaveLength(0);
		},
	);

	it('retains previous usage when configuration fails on continue', async () => {
		const provider = createScriptedProvider([
			{ content: [call], stopReason: 'toolUse' },
		]);
		const client = createPiAgent(server, provider);
		await client.setContext({ config, tools: [tool] });
		await collect(client.prompt(prompt));
		await client.setContext({ config: { apiKey: '' } });
		const result = await collect(client.continue());
		expect(result.turnEnd).toMatchObject({
			stopCode: StopCode.AuthKeyNotSpecified,
			stepUsage: { tokens: { total: 0 } },
			usage: { tokens: { total: 16 } },
		});
		expect(provider.requests).toHaveLength(1);
	});

	it('reports unexpected runner failures once and releases busy state', async () => {
		const client = createPiAgent(server, {
			streamFn: () => {
				throw new Error('broken stream');
			},
		});
		await client.setContext({ config });
		const result = await collect(client.prompt(prompt));
		expect(result.turnEnd).toMatchObject({
			stopCode: StopCode.LlmError,
			stopMessage: 'broken stream',
		});
		await client.setContext({ systemPrompt: 'idle' });
		expect(await collectEvents(client.continue())).toEqual([]);
	});

	it('rejects prompt at a paused boundary; cancellation drains on continue without inference', async () => {
		const provider = createScriptedProvider([
			{ content: [call], stopReason: 'toolUse' },
			{},
		]);
		const client = createPiAgent(server, provider);
		await client.setContext({ config, tools: [tool] });
		await collect(client.prompt(prompt));
		await expect(collect(client.prompt(prompt))).rejects.toThrow('turn paused');
		await client.cancel();
		const cancelled = await collect(client.continue());
		expect(cancelled.turnEnd).toMatchObject({
			stopCode: StopCode.Cancelled,
			usage: { tokens: { total: 16 } },
			stepUsage: { tokens: { total: 0 } },
		});
		expect(provider.requests).toHaveLength(1);
		expect(await collectEvents(client.continue())).toEqual([]);
		await collect(client.prompt(prompt));
		expect(provider.requests).toHaveLength(2);
	});

	it('restores tool result names from the Mini-ACP transcript', async () => {
		const provider = createScriptedProvider([{}]);
		const client = createPiAgent(server, provider);
		await client.setContext({
			config,
			messages: [
				{ role: 'assistant', content: [call] },
				{
					role: 'toolResult',
					toolCallId: 'c1',
					content: [{ type: 'text', text: 'restored' }],
				},
			],
		});
		await collect(client.prompt(prompt));
		expect(provider.requests[0]?.messages[1]).toMatchObject({
			role: 'toolResult',
			toolName: 'echo',
			toolCallId: 'c1',
		});
	});
});
