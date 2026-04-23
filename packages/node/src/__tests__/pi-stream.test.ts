import { beforeEach, describe, expect, it, vi } from 'vitest';

const { streamSimple } = vi.hoisted(() => ({
	streamSimple: vi.fn(),
}));

vi.mock('@mariozechner/pi-ai', () => ({ streamSimple }));

import { createPiStreamFn } from '../platform/pi-stream.js';

describe('createPiStreamFn', () => {
	beforeEach(() => {
		streamSimple.mockReset();
	});

	it('injects the custom fetch into streamSimple options', () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const result = Symbol('stream');
		streamSimple.mockReturnValue(result);
		const streamFn = createPiStreamFn({ fetch });
		const model = { id: 'gpt-5.4' };
		const context = { messages: [] };
		const options = { apiKey: 'token', transport: 'sse' };

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

	it('creates provider options when the caller omits them', () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const streamFn = createPiStreamFn({ fetch });
		const model = { id: 'gpt-5.4' };
		const context = { messages: [] };

		void streamFn(
			model as Parameters<typeof streamFn>[0],
			context as Parameters<typeof streamFn>[1],
		);

		expect(streamSimple).toHaveBeenCalledWith(model, context, { fetch });
	});
});
