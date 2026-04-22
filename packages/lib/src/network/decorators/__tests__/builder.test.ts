import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchRequest, WebFetchResponse } from '../../types.js';
import type { FetchDecorator } from '../types.js';
import { decorate } from '../builder.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

function tagHeader(tag: string): FetchDecorator {
	return (next) => async (request) => {
		const order = request.headers?.['x-order'];
		const appended = order ? `${order},${tag}` : tag;
		return next({
			...request,
			headers: { ...request.headers, 'x-order': appended },
		});
	};
}

describe('decorate', () => {
	it('returns the transport unchanged when no decorators are added', async () => {
		const transport = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = decorate(transport).build();

		await fetch({ url: 'https://example.com/', method: 'GET' });

		expect(transport).toHaveBeenCalledOnce();
	});

	it('applies the first .with() closest to the transport', async () => {
		const seen: WebFetchRequest[] = [];
		const transport: Fetch = async (request) => {
			seen.push(request);
			return okResponse();
		};

		const fetch = decorate(transport)
			.with(tagHeader('inner'))
			.with(tagHeader('middle'))
			.with(tagHeader('outer'))
			.build();

		await fetch({ url: 'https://example.com/', method: 'GET' });

		// Request order: outer → middle → inner → transport, so the transport
		// observes the headers in that append sequence.
		expect(seen[0]?.headers?.['x-order']).toBe('outer,middle,inner');
	});

	it('chains fluently and returns a Fetch from build()', async () => {
		const transport = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch: Fetch = decorate(transport).with(tagHeader('a')).build();

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
	});
});
