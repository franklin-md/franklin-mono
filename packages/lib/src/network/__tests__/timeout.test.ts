import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../types.js';
import { withTimeout } from '../timeout.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withTimeout', () => {
	it('returns the response when next resolves before the deadline', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withTimeout(5000)(next);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledOnce();
	});

	it('rejects with timeout error when next exceeds the deadline', async () => {
		const next = vi.fn<Fetch>().mockImplementation(
			() =>
				new Promise<WebFetchResponse>((resolve) => {
					setTimeout(() => resolve(okResponse()), 500);
				}),
		);
		const fetch = withTimeout(50)(next);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Request timed out after 50ms');
	});
});
