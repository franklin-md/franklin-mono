import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../types.js';
import { withRetry } from '../retry.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withRetry', () => {
	it('returns on first success', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withRetry({ maxAttempts: 3, delayMsRange: [1, 2] })(next);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledOnce();
	});

	it('retries on thrown error and succeeds', async () => {
		const next = vi.fn<Fetch>();
		next
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce(okResponse());
		const fetch = withRetry({ maxAttempts: 3, delayMsRange: [1, 2] })(next);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledTimes(2);
	});

	it('throws the last error after max attempts', async () => {
		const next = vi.fn<Fetch>().mockRejectedValue(new Error('final boom'));
		const fetch = withRetry({ maxAttempts: 3, delayMsRange: [1, 2] })(next);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('final boom');
		expect(next).toHaveBeenCalledTimes(3);
	});
});
