import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../../types.js';
import { withNormalizedHeaders } from '../normalize-headers.js';

function responseWithHeaders(
	headers: Record<string, string>,
): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers,
		body: new Uint8Array(),
	};
}

describe('withNormalizedHeaders', () => {
	it('lowercases request header keys', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(responseWithHeaders({}));
		const fetch = withNormalizedHeaders(next);

		await fetch({
			url: 'https://example.com/',
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'text/html' },
		});

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers).toEqual({
			'content-type': 'application/json',
			accept: 'text/html',
		});
	});

	it('lowercases response header keys', async () => {
		const next = vi
			.fn<Fetch>()
			.mockResolvedValue(
				responseWithHeaders({ 'Content-Type': 'text/html', Location: '/x' }),
			);
		const fetch = withNormalizedHeaders(next);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.headers).toEqual({
			'content-type': 'text/html',
			location: '/x',
		});
	});

	it('tolerates missing request headers', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(responseWithHeaders({}));
		const fetch = withNormalizedHeaders(next);

		await fetch({ url: 'https://example.com/', method: 'GET' });

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers).toEqual({});
	});
});
