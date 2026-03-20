// ---------------------------------------------------------------------------
// Pi Adapter integration test — real LLM call via OpenRouter
//
// Requires OPENROUTER_API_KEY in env or in .env at project root.
// Skips when no key is available.
// Uses anthropic/claude-haiku-4.5 on OpenRouter to verify the full adapter loop.
// ---------------------------------------------------------------------------

import { expect, it } from 'vitest';
import { getModel } from '@mariozechner/pi-ai';

import { createPiAdapter } from '../base/pi-adapter.js';
import type { BaseClient } from '../base/types.js';
import type { StreamEvent } from '../types/stream.js';
import type { Ctx } from '../types/context.js';
import { describeIfKey } from './utils/describe-if-key.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(tools: Ctx['tools'] = []): Ctx {
	return {
		history: {
			systemPrompt: 'You are a helpful assistant. Be very brief.',
			messages: [],
		},
		tools,
	};
}

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
// Integration tests
// ---------------------------------------------------------------------------

describeIfKey(
	'OPENROUTER_API_KEY',
	'Pi Adapter — integration (OpenRouter, Claude Haiku 4.5)',
	() => {
		const model = getModel('openrouter', 'z-ai/glm-5');

		it('simple text prompt returns a coherent response', async () => {
			const client: BaseClient = {
				toolExecute: async () => {
					throw new Error('toolExecute should not be called');
				},
			};

			const adapter = createPiAdapter({
				client,
				model,
				ctx: makeCtx(),
			});

			const events = await collect(
				adapter.prompt({
					message: {
						role: 'user',
						content: [
							{
								type: 'text',
								text: 'What is 2+2? Reply with just the number.',
							},
						],
					},
				}),
			);

			// Basic structure: turnStart ... chunks ... update ... turnEnd
			expect(events[0]).toEqual({ type: 'turnStart' });

			const turnEnd = events[events.length - 1]!;
			expect(turnEnd.type).toBe('turnEnd');
			expect((turnEnd as { error?: unknown }).error).toBeUndefined();

			// Should have at least one text chunk
			const textChunks = events.filter(
				(e) => e.type === 'chunk' && e.content.type === 'text',
			);
			expect(textChunks.length).toBeGreaterThan(0);

			// The combined text should contain "4"
			const allText = textChunks
				.map((e) =>
					e.type === 'chunk' && e.content.type === 'text' ? e.content.text : '',
				)
				.join('');
			expect(allText).toContain('4');

			// Should have an update event with the complete assistant message
			const updates = events.filter((e) => e.type === 'update');
			expect(updates.length).toBe(1);
		}, 30_000);

		it('tool call flow — model calls a tool, gets result, responds', async () => {
			const client: BaseClient = {
				toolExecute: async ({ call }) => ({
					toolCallId: call.id,
					content: [
						{ type: 'text', text: JSON.stringify({ result: 'Paris' }) },
					],
				}),
			};

			const ctx = makeCtx([
				{
					name: 'lookup_capital',
					description:
						'Look up the capital city of a country. Returns JSON with the capital.',
					inputSchema: {
						type: 'object',
						properties: {
							country: {
								type: 'string',
								description: 'The country name',
							},
						},
						required: ['country'],
					},
				},
			]);

			const adapter = createPiAdapter({
				client,
				model,
				ctx,
			});

			const events = await collect(
				adapter.prompt({
					message: {
						role: 'user',
						content: [
							{
								type: 'text',
								text: 'What is the capital of France? Use the lookup_capital tool to find out.',
							},
						],
					},
				}),
			);

			expect(events[0]).toEqual({ type: 'turnStart' });
			const turnEnd = events[events.length - 1]!;
			expect(turnEnd.type).toBe('turnEnd');
			expect((turnEnd as { error?: unknown }).error).toBeUndefined();

			// Should have a toolCall chunk
			const toolChunks = events.filter(
				(e) => e.type === 'chunk' && e.content.type === 'toolCall',
			);
			expect(toolChunks.length).toBeGreaterThanOrEqual(1);

			// Final text should mention Paris
			const textChunks = events.filter(
				(e) => e.type === 'chunk' && e.content.type === 'text',
			);
			const allText = textChunks
				.map((e) =>
					e.type === 'chunk' && e.content.type === 'text' ? e.content.text : '',
				)
				.join('');
			expect(allText.toLowerCase()).toContain('paris');
		}, 60_000);
	},
);
