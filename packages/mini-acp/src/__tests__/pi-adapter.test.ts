// ---------------------------------------------------------------------------
// Pi Adapter tests — mock streamFn, mock BaseClient, test the full flow
// ---------------------------------------------------------------------------

import { describe, expect, it, vi } from 'vitest';
import type {
	AssistantMessage,
	AssistantMessageEvent,
	Model,
} from '@mariozechner/pi-ai';
import { createAssistantMessageEventStream } from '@mariozechner/pi-ai';
import type { StreamFn } from '@mariozechner/pi-agent-core';

import { createPiAdapter } from '../base/pi/adapter.js';
import type { TurnAgent } from '../base/types.js';
import type { StreamEvent } from '../types/stream.js';
import type { Ctx } from '../types/context.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ZERO_USAGE = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} as const;

/** Build a minimal pi-ai AssistantMessage for a text-only response */
function textAssistantMessage(text: string): AssistantMessage {
	return {
		role: 'assistant',
		content: [{ type: 'text', text }],
		api: 'anthropic-messages',
		provider: 'anthropic',
		model: 'mock',
		usage: ZERO_USAGE,
		stopReason: 'stop',
		timestamp: Date.now(),
	};
}

/** Build a pi-ai AssistantMessage that requests a tool call */
function toolCallAssistantMessage(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown>,
): AssistantMessage {
	return {
		role: 'assistant',
		content: [
			{
				type: 'toolCall',
				id: toolCallId,
				name: toolName,
				arguments: args,
			},
		],
		api: 'anthropic-messages',
		provider: 'anthropic',
		model: 'mock',
		usage: ZERO_USAGE,
		stopReason: 'toolUse',
		timestamp: Date.now(),
	};
}

/** A fake Model object that satisfies the type. Never actually used for API calls. */
const mockModel: Model<string> = {
	id: 'mock-model',
	name: 'Mock',
	api: 'anthropic-messages',
	provider: 'anthropic',
	baseUrl: 'http://localhost',
	reasoning: false,
	input: ['text'],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 100000,
	maxTokens: 4096,
};

/**
 * Create a mock streamFn that returns a scripted sequence of assistant messages.
 * Each call to the streamFn pops the next message from the queue.
 */
function createMockStreamFn(responses: AssistantMessage[]): StreamFn {
	const queue = [...responses];

	return (() => {
		const msg = queue.shift();
		if (!msg) throw new Error('Mock streamFn: no more responses');

		const stream = createAssistantMessageEventStream();

		// Emit the event sequence asynchronously
		queueMicrotask(() => {
			const partial: AssistantMessage = { ...msg, content: [] };

			stream.push({ type: 'start', partial } as AssistantMessageEvent);

			for (let i = 0; i < msg.content.length; i++) {
				const block = msg.content[i]!;

				if (block.type === 'text') {
					stream.push({
						type: 'text_start',
						contentIndex: i,
						partial: { ...partial, content: [...partial.content, block] },
					} as AssistantMessageEvent);
					stream.push({
						type: 'text_delta',
						contentIndex: i,
						delta: block.text,
						partial: { ...partial, content: [...partial.content, block] },
					} as AssistantMessageEvent);
					stream.push({
						type: 'text_end',
						contentIndex: i,
						content: block.text,
						partial: { ...partial, content: [...partial.content, block] },
					} as AssistantMessageEvent);
				} else if (block.type === 'toolCall') {
					stream.push({
						type: 'toolcall_start',
						contentIndex: i,
						partial: { ...partial, content: [...partial.content, block] },
					} as AssistantMessageEvent);
					stream.push({
						type: 'toolcall_end',
						contentIndex: i,
						toolCall: block,
						partial: { ...partial, content: [...partial.content, block] },
					} as AssistantMessageEvent);
				}
			}

			stream.push({
				type: 'done',
				reason: msg.stopReason as 'stop' | 'length' | 'toolUse',
				message: msg,
			} as AssistantMessageEvent);
		});

		return stream;
	}) as unknown as StreamFn;
}

/** Minimal context: system prompt, no history, optionally tools */
function makeCtx(tools: Ctx['tools'] = []): Ctx {
	return {
		history: {
			systemPrompt: 'You are a test agent.',
			messages: [],
		},
		tools,
	};
}

/** Collect all stream events from an AsyncIterable */
async function collect(
	stream: AsyncIterable<StreamEvent>,
): Promise<StreamEvent[]> {
	const events: StreamEvent[] = [];
	for await (const e of stream) {
		events.push(e);
	}
	return events;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createPiAdapter', () => {
	it('simple text response — emits turnStart, chunks, update, turnEnd', async () => {
		const client: TurnAgent = {
			toolExecute: vi.fn(),
		};

		const adapter = createPiAdapter({
			client,
			model: mockModel,
			ctx: makeCtx(),
			streamFn: createMockStreamFn([textAssistantMessage('Hello world')]),
		});

		const events = await collect(
			adapter.prompt({
				message: { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
			}),
		);

		// Should have turnStart, at least one chunk, an update, and turnEnd
		expect(events[0]).toEqual({ type: 'turnStart' });
		expect(events[events.length - 1]).toEqual({ type: 'turnEnd' });

		// Find text chunks
		const chunks = events.filter(
			(e): e is Extract<StreamEvent, { type: 'chunk' }> => e.type === 'chunk',
		);
		expect(chunks.length).toBeGreaterThan(0);

		const textChunk = chunks.find((e) => e.content.type === 'text');
		expect(textChunk).toBeDefined();
		expect(textChunk!.content).toEqual({ type: 'text', text: 'Hello world' });

		// Find update with complete message
		const updates = events.filter(
			(e): e is Extract<StreamEvent, { type: 'update' }> => e.type === 'update',
		);
		expect(updates.length).toBe(1);
		expect(updates[0]!.message.role).toBe('assistant');

		// toolExecute should not have been called
		expect(client.toolExecute).not.toHaveBeenCalled();
	});

	it('tool call flow — agent calls tool via BaseClient, then responds', async () => {
		const toolCallId = 'tc-001';
		const client: TurnAgent = {
			toolExecute: vi.fn().mockResolvedValue({
				toolCallId,
				content: [{ type: 'text', text: '42' }],
			}),
		};

		const ctx = makeCtx([
			{
				name: 'calculate',
				description: 'Does math',
				inputSchema: {
					type: 'object',
					properties: { expression: { type: 'string' } },
				},
			},
		]);

		// First response: tool call. Second response: text with result.
		const adapter = createPiAdapter({
			client,
			model: mockModel,
			ctx,
			streamFn: createMockStreamFn([
				toolCallAssistantMessage(toolCallId, 'calculate', {
					expression: '6*7',
				}),
				textAssistantMessage('The answer is 42.'),
			]),
		});

		const events = await collect(
			adapter.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'What is 6*7?' }],
				},
			}),
		);

		// toolExecute should have been called once with the right tool call
		expect(client.toolExecute).toHaveBeenCalledTimes(1);
		expect(client.toolExecute).toHaveBeenCalledWith({
			call: {
				type: 'toolCall',
				id: toolCallId,
				name: 'calculate',
				arguments: { expression: '6*7' },
			},
		});

		// Should have turnStart and turnEnd
		expect(events[0]).toEqual({ type: 'turnStart' });
		expect(events[events.length - 1]).toEqual({ type: 'turnEnd' });

		// Should contain a toolCall chunk
		const toolChunks = events.filter(
			(e) => e.type === 'chunk' && e.content.type === 'toolCall',
		);
		expect(toolChunks.length).toBeGreaterThanOrEqual(1);

		// Should contain a text chunk with the final answer
		const textChunks = events.filter(
			(e) => e.type === 'chunk' && e.content.type === 'text',
		);
		const finalText = textChunks.find(
			(e) =>
				e.type === 'chunk' &&
				e.content.type === 'text' &&
				e.content.text.includes('42'),
		);
		expect(finalText).toBeDefined();
	});

	it('cancel — returns turnEnd with error', async () => {
		const client: TurnAgent = {
			toolExecute: vi.fn(),
		};

		const adapter = createPiAdapter({
			client,
			model: mockModel,
			ctx: makeCtx(),
			streamFn: createMockStreamFn([textAssistantMessage('ignored')]),
		});

		const result = await adapter.cancel({});

		expect(result).toEqual({
			type: 'turnEnd',
			error: { code: -1, message: 'Cancelled' },
		});
	});
});
