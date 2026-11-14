import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../../types.js';
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

function stallAfterSetup(): Promise<WebFetchResponse> {
	// Transport setup consumes part of the budget before returning its promise.
	vi.advanceTimersByTime(1);
	return new Promise<WebFetchResponse>(() => {});
}

describe('withTimeout', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('preserves an earlier deadline supplied by the caller', async () => {
		const deadline = Date.now() + 1000;
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		await withTimeout(5000)(next)({
			url: 'https://example.com/',
			method: 'GET',
			deadline,
		});
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ deadline }));
	});

	it('returns the response when next resolves before the deadline', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withTimeout(5000)(next);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('rejects with timeout error when next exceeds the deadline', async () => {
		const next = vi.fn<Fetch>(stallAfterSetup);
		const fetch = withTimeout(50)(next);
		const settled = vi.fn();
		const failure = fetch({ url: 'https://example.com/', method: 'GET' }).catch(
			(error: unknown) => error,
		);
		void failure.then(settled);

		await vi.advanceTimersByTimeAsync(48);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(await failure).toEqual(new Error('Request timed out after 50ms'));
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ deadline: 1050 }),
		);
	});

	it('expires at an earlier caller deadline despite transport setup time', async () => {
		const next = vi.fn<Fetch>(stallAfterSetup);
		const settled = vi.fn();
		const failure = withTimeout(50)(next)({
			url: 'https://example.com/',
			method: 'GET',
			deadline: 1020,
		}).catch((error: unknown) => error);
		void failure.then(settled);

		await vi.advanceTimersByTimeAsync(18);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(await failure).toEqual(new Error('Request deadline exceeded'));
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ deadline: 1020 }),
		);
	});

	it('rejects expired caller deadlines without starting the transport', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		await expect(
			withTimeout(50)(next)({
				url: 'https://example.com/',
				method: 'GET',
				deadline: 999,
			}),
		).rejects.toThrow('Request deadline exceeded');
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects a response completed after synchronous work blocks past the deadline', async () => {
		const next = vi.fn<Fetch>().mockImplementation(async () => {
			vi.setSystemTime(1051);
			return okResponse();
		});
		await expect(
			withTimeout(50)(next)({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Request timed out after 50ms');
		expect(vi.getTimerCount()).toBe(0);
	});
});
