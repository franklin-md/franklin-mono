import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../types.js';
import { withNormalize } from '../normalize.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withNormalize', () => {
	it('rejects empty URL', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withNormalize(next);

		await expect(fetch({ url: '', method: 'GET' })).rejects.toThrow(
			'URL is required',
		);
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects malformed URL', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withNormalize(next);

		await expect(fetch({ url: 'not a url', method: 'GET' })).rejects.toThrow(
			'Invalid URL: not a url',
		);
	});

	it('rejects non-http(s) protocols', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withNormalize(next);

		await expect(
			fetch({ url: 'ftp://example.com/', method: 'GET' }),
		).rejects.toThrow('Only HTTP and HTTPS URLs are supported');
	});

	it('applies a default user-agent', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withNormalize(next);

		await fetch({ url: 'https://example.com/', method: 'GET' });

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['user-agent']).toMatch(/Franklin/);
	});

	it('lowercases header keys', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withNormalize(next);

		await fetch({
			url: 'https://example.com/',
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'text/html' },
		});

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['content-type']).toBe('application/json');
		expect(call?.headers?.['accept']).toBe('text/html');
	});

	it('preserves caller user-agent over default', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withNormalize(next);

		await fetch({
			url: 'https://example.com/',
			method: 'GET',
			headers: { 'User-Agent': 'my-agent/1.0' },
		});

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['user-agent']).toBe('my-agent/1.0');
	});

	it('rejects unrecognised methods', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withNormalize(next);

		await expect(
			fetch({
				url: 'https://example.com/',
				// @ts-expect-error intentional — runtime validation
				method: 'CONNECT',
			}),
		).rejects.toThrow('Unsupported HTTP method');
		expect(next).not.toHaveBeenCalled();
	});
});
