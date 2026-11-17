import { describe, expect, it, vi } from 'vitest';
import {
	getCurrentSystemPrompt,
	getCurrentTools,
	type TranscriptContext as PiContext,
} from '@earendil-works/pi-ai';
import { createPiTestConnector } from '../../../../../../testing/pi-connector.js';
import { createPiTestResponse } from '../../../../../../testing/pi-response.js';
import { createChunkedSummarizer } from '../create.js';
import { createChunks } from '../chunks.js';

const config = {
	provider: 'openai-codex',
	model: 'gpt-6.1-sol',
	apiKey: 'test-only',
};
const messages = [
	{
		role: 'user' as const,
		content: [{ type: 'text' as const, text: 'x'.repeat(30_000) }],
	},
];

describe('chunked summarizer', () => {
	it('keeps prior summaries as context and concatenates each chunk summary unchanged', async () => {
		const requests: PiContext[] = [];
		const connector = createPiTestConnector({
			streamFn: (model, context) => {
				requests.push(structuredClone(context));
				return createPiTestResponse(model, [
					{ type: 'text', text: `Summary ${requests.length}` },
				]);
			},
		});
		const summarize = createChunkedSummarizer(connector);
		const result = await summarize({
			messages,
			config,
			contextWindow: 8192,
			signal: new AbortController().signal,
		});
		expect(result.summary).toBe('Summary 1\n\nSummary 2\n\nSummary 3');
		expect(result.usage.tokens.total).toBe(45);
		expect(requests).toHaveLength(3);
		expect(
			requests.every(
				(request) =>
					request.messages.filter((message) => message.role === 'user')
						.length === 1,
			),
		).toBe(true);
		expect(
			JSON.stringify(
				requests[0]!.messages.filter((message) => message.role === 'user'),
			),
		).not.toContain('Prior summaries');
		expect(JSON.stringify(requests[1]!.messages)).toContain('Summary 1');
		expect(JSON.stringify(requests[2]!.messages)).toContain(
			'Summary 1\\n\\nSummary 2',
		);
		expect(getCurrentSystemPrompt(requests[0]!.messages)).toContain(
			'summarize only the new chunk',
		);
		expect(getCurrentTools(requests[0]!.messages)).toEqual([]);
	});

	it('covers the entire transcript and budgets the combined summaries including separators', () => {
		const transcript = 'x'.repeat(90_000);
		const chunks = createChunks(transcript, 8192);
		expect(chunks.map((chunk) => chunk.text).join('')).toBe(transcript);
		expect(
			chunks.reduce((size, chunk) => size + chunk.maxSummaryCharacters, 0) +
				(chunks.length - 1) * 2,
		).toBeLessThanOrEqual(8192);
	});

	it('rejects a chunk that exceeds its allocation and disposes the connection', async () => {
		const dispose = vi.fn();
		const connector = createPiTestConnector({
			streamFn: (model) =>
				createPiTestResponse(model, [{ type: 'text', text: 's'.repeat(3000) }]),
		});
		const summarize = createChunkedSummarizer(async (server) => {
			const client = await connector(server);
			return {
				...client,
				dispose: async () => {
					dispose();
					await client.dispose();
				},
			};
		});
		await expect(
			summarize({
				messages,
				config,
				contextWindow: 8192,
				signal: new AbortController().signal,
			}),
		).rejects.toThrow('Invalid compaction summary');
		expect(dispose).toHaveBeenCalledOnce();
	});

	it('does not start inference if cancelled during context setup', async () => {
		const abort = new AbortController();
		const inference = vi.fn(
			(model: Parameters<typeof createPiTestResponse>[0]) =>
				createPiTestResponse(model, []),
		);
		const connector = createPiTestConnector({ streamFn: inference });
		const dispose = vi.fn();
		const summarize = createChunkedSummarizer(async (server) => {
			const client = await connector(server);
			return {
				...client,
				setContext: async (patch) => {
					await client.setContext(patch);
					if (Object.keys(patch).length === 1 && patch.messages) abort.abort();
				},
				dispose: async () => {
					dispose();
					await client.dispose();
				},
			};
		});
		await expect(
			summarize({
				messages,
				config,
				contextWindow: 8192,
				signal: abort.signal,
			}),
		).rejects.toThrow();
		expect(inference).not.toHaveBeenCalled();
		expect(dispose).toHaveBeenCalledOnce();
	});
});
