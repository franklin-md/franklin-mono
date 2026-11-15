import { createPiAgent, collect } from '@franklin/mini-acp';
import { zstdDecompressSync } from 'node:zlib';
import { normalizeContext } from '@earendil-works/pi-ai';
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

	it.each([
		[false, null, 0.0142],
		[true, 0.2, 0.2142],
	] as const)(
		'retains OpenRouter billing through the full Pi and Mini-ACP loop (BYOK=%s)',
		async (isByok, upstreamCost, expectedCost) => {
			const chunk = {
				id: 'gen-test',
				choices: [
					{
						index: 0,
						delta: { role: 'assistant', content: 'done' },
						finish_reason: 'stop',
					},
				],
				usage: {
					prompt_tokens: 100,
					completion_tokens: 10,
					total_tokens: 110,
					cost: 0.0142,
					is_byok: isByok,
					cost_details: { upstream_inference_cost: upstreamCost },
				},
			};
			const customFetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
				async () =>
					new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
						headers: { 'content-type': 'text/event-stream' },
					}),
			);
			const client = createPiAgent(
				{
					toolExecute: async ({ call }) => ({
						toolCallId: call.id,
						content: [],
					}),
				},
				{ streamFn: createPiStreamFn({ fetch: customFetch }) },
			);
			await client.initialize();
			await client.setContext({
				config: {
					provider: 'openrouter',
					model: 'deepseek/deepseek-v4-pro',
					apiKey: 'test-only',
				},
			});
			const result = await collect(
				client.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				}),
			);
			expect(result.turnEnd?.stopCode).toBe(1000);
			expect(result.turnEnd?.usage.cost.total).toBeCloseTo(expectedCost);
			expect(customFetch).toHaveBeenCalledOnce();
			expect(globalFetch).not.toHaveBeenCalled();
		},
	);

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
			getModel('openai-codex', 'gpt-6.1-sol'),
			normalizeContext({ messages: [] }),
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
			getModel('opencode-go', 'deepseek-v4-pro'),
			normalizeContext({ messages: [] }),
			{ apiKey: 'opencode-go-test', sessionId: 'session-123' },
		);

		void stream;
		await vi.waitFor(() => {
			expect(customFetch).toHaveBeenCalledOnce();
		});

		expect(customFetch).toHaveBeenCalledExactlyOnceWith(
			'https://opencode.ai/inference/go/openai/v1/chat/completions',
			expect.objectContaining({ method: 'POST' }),
		);
		const headers = new Headers(customFetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get('x-opencode-session')).toBe('session-123');
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it.each([
		['gpt-6.2-sol', 'xhigh'],
		['gpt-6.2-sol', 'max'],
		['gpt-6.2-astra', 'xhigh'],
		['gpt-6.2-astra', 'max'],
	] as const)(
		'sends %s with %s reasoning through Mini-ACP and the Codex request',
		async (model, reasoning) => {
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
			const client = createPiAgent(
				{
					toolExecute: async ({ call }) => ({
						toolCallId: call.id,
						content: [],
					}),
				},
				{
					streamFn: (model, context, options) =>
						streamFn(model, context, { ...options, transport: 'sse' }),
				},
			);
			await client.setContext({
				config: {
					provider: 'openai-codex',
					model,
					apiKey: createCodexToken(),
					reasoning,
				},
			});
			await collect(
				client.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				}),
			);

			expect(customFetch).toHaveBeenCalledExactlyOnceWith(
				'https://chatgpt.com/backend-api/codex/responses',
				expect.objectContaining({
					method: 'POST',
				}),
			);

			const request = customFetch.mock.calls[0]?.[1];
			if (
				request === undefined ||
				(typeof request.body !== 'string' &&
					!(request.body instanceof Uint8Array))
			) {
				throw new Error('Expected request init');
			}

			const body =
				typeof request.body === 'string'
					? request.body
					: zstdDecompressSync(request.body).toString();
			expect(JSON.parse(body)).toMatchObject({
				model,
				reasoning: {
					effort: reasoning,
					summary: 'auto',
				},
			});
		},
	);

	it.each(['xhigh', 'max'] as const)(
		'uses Pi Claude %s effort markers through Mini-ACP',
		async (reasoning) => {
			const customFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				new Response(
					JSON.stringify({
						type: 'error',
						error: { type: 'authentication_error', message: 'denied' },
					}),
					{ status: 401, headers: { 'content-type': 'application/json' } },
				),
			);
			const client = createPiAgent(
				{
					toolExecute: async ({ call }) => ({
						toolCallId: call.id,
						content: [],
					}),
				},
				{
					streamFn: createPiStreamFn({ fetch: customFetch }),
				},
			);
			await client.setContext({
				config: {
					provider: 'openrouter',
					model: 'anthropic/claude-fable-5.2',
					apiKey: 'test-only',
					reasoning,
				},
			});
			await collect(
				client.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				}),
			);
			expect(customFetch).toHaveBeenCalledOnce();
			const request = customFetch.mock.calls[0]?.[1];
			if (typeof request?.body !== 'string')
				throw new Error('Expected JSON request');
			expect(JSON.parse(request.body)).toMatchObject({
				model: 'anthropic/claude-fable-5.2',
				thinking: { type: 'adaptive' },
				messages: expect.arrayContaining([
					{ role: 'system', content: [], output_config: { effort: reasoning } },
				]),
			});
			expect(globalFetch).not.toHaveBeenCalled();
		},
	);

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
			normalizeContext({ messages: [] }),
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
