import { getBuiltinModel as getModel } from '@earendil-works/pi-ai/providers/all';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPiStreamFn } from '../platform/pi-stream.js';

function createCodexToken(accountId = 'acct_test'): string {
	const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
	const payload = btoa(
		JSON.stringify({
			'https://api.openai.com/auth': {
				chatgpt_account_id: accountId,
			},
		}),
	);
	return `${header}.${payload}.signature`;
}

describe('createPiStreamFn with pi-ai simple streams', () => {
	const globalFetch = vi.fn<typeof globalThis.fetch>();

	beforeEach(() => {
		globalFetch.mockReset();
		vi.stubGlobal('fetch', globalFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('preserves the custom fetch through pi-ai simple codex options', async () => {
		const customFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
			new Response(JSON.stringify({ error: { message: 'denied' } }), {
				status: 401,
				headers: { 'content-type': 'application/json' },
			}),
		);
		globalFetch.mockResolvedValue(
			new Response('unexpected global fetch', { status: 418 }),
		);

		const streamFn = createPiStreamFn({ fetch: customFetch });
		const stream = streamFn(
			getModel('openai-codex', 'gpt-5.4'),
			{ messages: [] },
			{
				apiKey: createCodexToken(),
				transport: 'sse',
			},
		);

		void stream;
		await vi.waitFor(() => {
			expect(customFetch).toHaveBeenCalledOnce();
		});

		expect(customFetch).toHaveBeenCalledExactlyOnceWith(
			'https://chatgpt.com/backend-api/codex/responses',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it('preserves the custom fetch through pi-ai simple OpenAI-compatible options', async () => {
		const customFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
			new Response(JSON.stringify({ error: { message: 'denied' } }), {
				status: 401,
				headers: { 'content-type': 'application/json' },
			}),
		);
		globalFetch.mockResolvedValue(
			new Response('unexpected global fetch', { status: 418 }),
		);

		const streamFn = createPiStreamFn({ fetch: customFetch });
		const stream = streamFn(
			getModel('opencode-go', 'deepseek-v4-flash'),
			{ messages: [] },
			{ apiKey: 'opencode-go-test' },
		);

		void stream;
		await vi.waitFor(() => {
			expect(customFetch).toHaveBeenCalledOnce();
		});

		expect(customFetch).toHaveBeenCalledExactlyOnceWith(
			'https://opencode.ai/zen/go/v1/chat/completions',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it('preserves xhigh reasoning for the pi-ai GPT-5.5 codex model', async () => {
		const customFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
			new Response(
				'data: {"type":"response.completed","response":{"status":"completed"}}\n\n',
				{
					status: 200,
					headers: { 'content-type': 'text/event-stream' },
				},
			),
		);

		const streamFn = createPiStreamFn({ fetch: customFetch });
		const stream = streamFn(
			getModel('openai-codex', 'gpt-5.5'),
			{ messages: [] },
			{
				apiKey: createCodexToken(),
				reasoning: 'xhigh',
				transport: 'sse',
			},
		);

		for await (const _event of await Promise.resolve(stream)) {
			// Drain the stream so the request completes and assertions can inspect it.
		}

		expect(customFetch).toHaveBeenCalledExactlyOnceWith(
			'https://chatgpt.com/backend-api/codex/responses',
			expect.objectContaining({
				body: expect.any(String),
				method: 'POST',
			}),
		);

		const request = customFetch.mock.calls[0]?.[1];
		if (request === undefined || typeof request.body !== 'string') {
			throw new Error('Expected request init');
		}

		expect(JSON.parse(request.body)).toMatchObject({
			reasoning: {
				effort: 'xhigh',
				summary: 'auto',
			},
		});
	});

	it('preserves the custom fetch through pi-ai simple anthropic options', async () => {
		const customFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					type: 'error',
					error: { type: 'authentication_error', message: 'denied' },
				}),
				{
					status: 401,
					headers: { 'content-type': 'application/json' },
				},
			),
		);
		globalFetch.mockResolvedValue(
			new Response('unexpected global fetch', { status: 418 }),
		);

		const streamFn = createPiStreamFn({ fetch: customFetch });
		const stream = streamFn(
			getModel('anthropic', 'claude-sonnet-4-6'),
			{ messages: [] },
			{ apiKey: 'sk-ant-api03-test' },
		);

		void stream;
		await vi.waitFor(() => {
			expect(customFetch).toHaveBeenCalledOnce();
		});

		expect(customFetch).toHaveBeenCalledExactlyOnceWith(
			expect.stringMatching(/^https:\/\/api\.anthropic\.com\/v1\/messages/),
			expect.objectContaining({ method: 'POST' }),
		);
		expect(globalFetch).not.toHaveBeenCalled();
	});
});
