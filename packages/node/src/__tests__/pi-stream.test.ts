import { beforeEach, describe, expect, it, vi } from 'vitest';

const { streamSimple, streamSimpleOpenAICompletions } = vi.hoisted(() => ({
	streamSimple: vi.fn(),
	streamSimpleOpenAICompletions: vi.fn(),
}));

vi.mock('@earendil-works/pi-ai', () => ({ streamSimple }));
vi.mock('@earendil-works/pi-ai/openai-completions', () => ({
	streamSimpleOpenAICompletions,
}));

import { createPiStreamFn } from '../platform/pi-stream.js';

describe('createPiStreamFn', () => {
	beforeEach(() => {
		streamSimple.mockReset();
		streamSimpleOpenAICompletions.mockReset();
	});

	it('passes the custom fetch through Pi stream options', () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const result = {};
		streamSimple.mockReturnValue(result);
		const streamFn = createPiStreamFn({ fetch });
		const model = { id: 'gpt-5.4' };
		const context = { messages: [] };
		const options = { apiKey: 'token', transport: 'auto' };

		expect(
			streamFn(
				model as Parameters<typeof streamFn>[0],
				context as Parameters<typeof streamFn>[1],
				options as Parameters<typeof streamFn>[2],
			),
		).toBe(result);
		expect(streamSimple).toHaveBeenCalledWith(model, context, {
			...options,
			fetch,
		});
	});

	it('creates provider options when only fetch is available', () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const result = {};
		streamSimple.mockReturnValue(result);
		const streamFn = createPiStreamFn({ fetch });
		const model = { id: 'gpt-5.4' };
		const context = { messages: [] };

		void streamFn(
			model as Parameters<typeof streamFn>[0],
			context as Parameters<typeof streamFn>[1],
		);

		expect(streamSimple).toHaveBeenCalledWith(model, context, {
			fetch,
		});
	});

	it('passes the custom fetch to OpenAI completions streams', () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const result = {};
		streamSimpleOpenAICompletions.mockReturnValue(result);
		const streamFn = createPiStreamFn({ fetch });
		const model = { id: 'gpt-5.4', api: 'openai-completions' };
		const context = { messages: [] };
		const options = { apiKey: 'token' };

		expect(
			streamFn(
				model as Parameters<typeof streamFn>[0],
				context as Parameters<typeof streamFn>[1],
				options as Parameters<typeof streamFn>[2],
			),
		).toBe(result);
		expect(streamSimpleOpenAICompletions).toHaveBeenCalledWith(model, context, {
			...options,
			fetch,
		});
	});

	it.each([
		'openai-completions',
		'openai-responses',
		'anthropic-messages',
	] as const)('adds the required OpenCode session header for %s', (api) => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const result = {};
		const expectedStream =
			api === 'openai-completions'
				? streamSimpleOpenAICompletions
				: streamSimple;
		expectedStream.mockReturnValue(result);
		const streamFn = createPiStreamFn({ fetch });
		const model = { id: 'go-model', provider: 'opencode-go', api };
		const context = { messages: [] };
		const options = {
			apiKey: 'token',
			sessionId: 'session-123',
			headers: { 'x-existing': 'preserved' },
		};

		expect(
			streamFn(
				model as Parameters<typeof streamFn>[0],
				context as Parameters<typeof streamFn>[1],
				options as Parameters<typeof streamFn>[2],
			),
		).toBe(result);
		expect(expectedStream).toHaveBeenCalledWith(model, context, {
			...options,
			fetch,
			headers: {
				'x-existing': 'preserved',
				'x-opencode-session': 'session-123',
			},
		});
	});
});
