import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../../types.js';
import { withOnlyHTTP } from '../only-http.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withOnlyHTTP', () => {
	it('allows http and https requests through', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withOnlyHTTP()(next);

		await expect(
			fetch({ url: 'http://example.com/', method: 'GET' }),
		).resolves.toMatchObject({ status: 200 });
		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).resolves.toMatchObject({ status: 200 });
		expect(next).toHaveBeenCalledTimes(2);
	});

	it('rejects non-http protocols before calling next', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withOnlyHTTP()(next);

		await expect(
			fetch({ url: 'data:text/plain,hello', method: 'GET' }),
		).rejects.toThrow('Only HTTP and HTTPS URLs are supported');
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects invalid URLs before calling next', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withOnlyHTTP()(next);

		await expect(fetch({ url: 'not a url', method: 'GET' })).rejects.toThrow(
			'Invalid URL: not a url',
		);
		expect(next).not.toHaveBeenCalled();
	});
});
