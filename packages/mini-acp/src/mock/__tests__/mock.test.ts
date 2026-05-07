import { describe, expect, it, vi } from 'vitest';

import type { MiniACPAgent } from '../../protocol/index.js';
import type { UserMessage } from '../../types/message.js';
import { StopCode } from '../../types/stop-code.js';
import type { StreamEvent } from '../../types/stream.js';
import {
	createMockMiniACP,
	finishedTurn,
	text,
	textChunks,
	textChunkStream,
	toolCalls,
	turn,
	turnEnd,
} from '../index.js';

const userMessage: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'hi' }],
};

function noopServer(): MiniACPAgent {
	const toolExecute: MiniACPAgent['toolExecute'] = async ({ call }) => ({
		toolCallId: call.id,
		content: [{ type: 'text' as const, text: 'ok' }],
	});

	return {
		toolExecute: vi.fn(toolExecute),
	};
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

describe('mock descriptor factories', () => {
	it('textChunkStream defaults to character chunks', () => {
		expect(textChunkStream('abc')).toEqual({
			type: 'assistantText',
			text: 'abc',
			chunks: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
		});
	});

	it('textChunkStream accepts a tokenizer and chunk delay factory', () => {
		expect(
			textChunkStream('hello world', {
				tokenizer: (value) => value.split(/(\s+)/).filter(Boolean),
				delayMs: (_chunk, index) => index * 5,
				delayMode: 'elapsed',
			}),
		).toEqual({
			type: 'assistantText',
			text: 'hello world',
			chunkDelayMode: 'elapsed',
			chunks: [
				{ text: 'hello', delayMs: 0 },
				{ text: ' ', delayMs: 5 },
				{ text: 'world', delayMs: 10 },
			],
		});
	});

	it('textChunks derives the final update text from chunks', () => {
		expect(textChunks([{ text: 'he' }, { text: 'llo', delayMs: 1 }])).toEqual({
			type: 'assistantText',
			text: 'hello',
			chunks: [{ text: 'he' }, { text: 'llo', delayMs: 1 }],
		});
	});
});

describe('createMockMiniACP', () => {
	it('streams non-chunked text as an update and turnEnd', async () => {
		const mock = createMockMiniACP({
			turns: [turn([text('hello'), turnEnd()])],
		});
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({ history: { systemPrompt: 'system' } });

		const events = await collect(client.prompt(userMessage));

		expect(events).toEqual([
			{ type: 'turnStart' },
			{
				type: 'update',
				messageId: 'mock-message-1',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'hello' }],
				},
			},
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);
		expect(mock.context().history.messages).toEqual([
			userMessage,
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'hello' }],
			},
		]);
		expect(mock.calls().initialize).toBe(1);
		expect(mock.calls().setContext).toEqual([
			{ history: { systemPrompt: 'system' } },
		]);
	});

	it('streams text chunks with one generated message ID and matching update', async () => {
		const mock = createMockMiniACP({
			turns: [turn([textChunkStream('ok'), turnEnd()])],
		});
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({});

		const events = await collect(client.prompt(userMessage));
		const chunks = events.filter(
			(event): event is Extract<StreamEvent, { type: 'chunk' }> =>
				event.type === 'chunk',
		);
		const update = events.find(
			(event): event is Extract<StreamEvent, { type: 'update' }> =>
				event.type === 'update',
		);

		expect(chunks).toEqual([
			{
				type: 'chunk',
				messageId: 'mock-message-1',
				role: 'assistant',
				content: { type: 'text', text: 'o' },
			},
			{
				type: 'chunk',
				messageId: 'mock-message-1',
				role: 'assistant',
				content: { type: 'text', text: 'k' },
			},
		]);
		expect(update).toEqual({
			type: 'update',
			messageId: 'mock-message-1',
			message: {
				role: 'assistant',
				content: [{ type: 'text', text: 'ok' }],
			},
		});
	});

	it('calls app-owned tools with generated IDs and records observed results', async () => {
		const toolExecute: MiniACPAgent['toolExecute'] = async ({ call }) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: `ran ${call.name}` }],
		});
		const server: MiniACPAgent = {
			toolExecute: vi.fn(toolExecute),
		};
		const mock = createMockMiniACP({
			turns: [
				turn([
					toolCalls([{ name: 'read_file', arguments: { path: '/tmp/a.txt' } }]),
					turnEnd(),
				]),
			],
		});
		const client = await mock.connector(server);

		await client.initialize();
		await client.setContext({});
		await collect(client.prompt(userMessage));

		expect(server.toolExecute).toHaveBeenCalledWith({
			call: {
				type: 'toolCall',
				id: 'mock-tool-call-1',
				name: 'read_file',
				arguments: { path: '/tmp/a.txt' },
			},
		});
		expect(mock.calls().toolCalls).toEqual([
			{
				type: 'toolCall',
				id: 'mock-tool-call-1',
				name: 'read_file',
				arguments: { path: '/tmp/a.txt' },
			},
		]);
		expect(mock.calls().toolResults).toEqual([
			{
				toolCallId: 'mock-tool-call-1',
				content: [{ type: 'text', text: 'ran read_file' }],
			},
		]);
		expect(mock.context().history.messages).toContainEqual({
			role: 'toolResult',
			toolCallId: 'mock-tool-call-1',
			content: [{ type: 'text', text: 'ran read_file' }],
		});
	});

	it('records an empty tool-call phase', async () => {
		const mock = createMockMiniACP({
			turns: [turn([toolCalls([]), turnEnd()])],
		});
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({});
		await collect(client.prompt(userMessage));

		expect(mock.calls().toolCallPhases).toEqual([[]]);
		expect(mock.calls().toolCalls).toEqual([]);
	});

	it('throws for unscheduled prompts by default', async () => {
		const mock = createMockMiniACP();
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({});

		await expect(collect(client.prompt(userMessage))).rejects.toThrow(
			'No mock turn descriptor scheduled for prompt.',
		);
	});

	it('throws when a descriptor continues after turnEnd', async () => {
		const mock = createMockMiniACP({
			turns: [turn([turnEnd(), text('late')])],
		});
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({});

		await expect(collect(client.prompt(userMessage))).rejects.toThrow(
			'Mock turn descriptor must not include steps after turnEnd().',
		);
	});

	it('reuses defaultTurn for low-friction successful prompts', async () => {
		const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({});

		const first = await collect(client.prompt(userMessage));
		const second = await collect(client.prompt(userMessage));

		expect(first).toEqual([
			{ type: 'turnStart' },
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);
		expect(second).toEqual(first);
	});

	it('reset clears merged context fields', async () => {
		const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
		const client = await mock.connector(noopServer());

		await client.initialize();
		await client.setContext({
			config: { model: 'test-model', provider: 'test-provider', apiKey: 'key' },
		});

		mock.reset();

		expect(mock.context().config).toEqual({});
	});
});
