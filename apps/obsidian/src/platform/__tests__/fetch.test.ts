import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
	fetchMock: vi.fn(),
}));

vi.mock('undici', () => ({
	fetch: fetchMock,
}));

import { obsidianFetch } from '../fetch.js';

describe('obsidianFetch', () => {
	beforeEach(() => {
		fetchMock.mockReset();
	});

	afterEach(() => {
		fetchMock.mockReset();
	});

	it('issues Undici fetch with manual redirects', async () => {
		fetchMock.mockResolvedValue(new Response('ok'));

		await obsidianFetch({
			url: 'https://example.com/api',
			method: 'GET',
			headers: { 'user-agent': 'test' },
		});

		const [url, options] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toBe('https://example.com/api');
		expect(options).toEqual(
			expect.objectContaining({
				redirect: 'manual',
				credentials: 'omit',
				method: 'GET',
				headers: { 'user-agent': 'test' },
			}),
		);
	});

	it('passes Uint8Array bodies through to Undici fetch', async () => {
		const body = new TextEncoder().encode('{"hello":"world"}');
		fetchMock.mockResolvedValue(new Response('ok'));

		await obsidianFetch({
			url: 'https://example.com/',
			method: 'POST',
			body,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			expect.any(URL),
			expect.objectContaining({
				method: 'POST',
				body,
			}),
		);
	});

	it('maps Undici responses to WebFetchResponse', async () => {
		fetchMock.mockResolvedValue(
			new Response('hello', {
				status: 201,
				statusText: 'Created',
				headers: { 'content-type': 'application/json' },
			}),
		);

		const response = await obsidianFetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(201);
		expect(response.statusText).toBe('Created');
		expect(response.headers['content-type']).toBe('application/json');
		expect(response.body).toBeInstanceOf(Uint8Array);
		expect(new TextDecoder().decode(response.body)).toBe('hello');
	});

	it('returns redirects as raw 3xx responses so higher layers own redirect handling', async () => {
		fetchMock.mockResolvedValue(
			new Response(null, {
				status: 302,
				headers: { location: 'https://example.com/next' },
			}),
		);

		const response = await obsidianFetch({
			url: 'https://example.com/start',
			method: 'GET',
		});

		expect(response.url).toBe('https://example.com/start');
		expect(response.status).toBe(302);
		expect(response.statusText).toBe('');
		expect(response.headers.location).toBe('https://example.com/next');
		expect(response.body.byteLength).toBe(0);
	});

	it('surfaces non-2xx responses as data', async () => {
		fetchMock.mockResolvedValue(
			new Response('oops', {
				status: 500,
				statusText: 'Internal Server Error',
			}),
		);

		const response = await obsidianFetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(500);
		expect(response.statusText).toBe('Internal Server Error');
	});
});
