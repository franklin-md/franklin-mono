import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nodePlatformFetch } from '../platform/fetch.js';

function okResponse(): Response {
	return new Response('ok', {
		status: 200,
		headers: { 'content-type': 'text/plain' },
	});
}

describe('nodePlatformFetch', () => {
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('passes POST request body and headers through to globalThis.fetch', async () => {
		fetchMock.mockResolvedValue(okResponse());
		const body = new TextEncoder().encode('{"hello":"world"}');

		await nodePlatformFetch({
			url: 'https://example.com/search',
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			new URL('https://example.com/search'),
			expect.objectContaining({
				method: 'POST',
				body,
				redirect: 'manual',
				credentials: 'omit',
				headers: expect.objectContaining({
					'content-type': 'application/json',
				}),
			}),
		);
	});

	it('fills WebFetchResponse with url, status, headers, and body bytes', async () => {
		fetchMock.mockResolvedValue(
			new Response('hello', {
				status: 201,
				headers: { 'content-type': 'text/plain' },
			}),
		);

		const response = await nodePlatformFetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(201);
		expect(response.headers['content-type']).toBe('text/plain');
		expect(new TextDecoder().decode(response.body)).toBe('hello');
	});

	it('returns empty body for responses with no body stream', async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

		const response = await nodePlatformFetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(204);
		expect(response.body.byteLength).toBe(0);
	});
});
