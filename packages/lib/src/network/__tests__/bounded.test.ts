import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../types.js';
import { withBounded } from '../bounded.js';
import { withPolicy } from '../policy.js';

function okResponse(url = 'https://example.com/final'): WebFetchResponse {
	return {
		url,
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

function redirectResponse(to: string): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 302,
		statusText: 'Found',
		headers: { location: to },
		body: new Uint8Array(),
	};
}

describe('withBounded', () => {
	it('returns the final response when no redirect occurs', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 5 })(next);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledOnce();
	});

	it('follows redirects up to the cap and re-invokes next with the new URL', async () => {
		const next = vi.fn<Fetch>();
		next
			.mockResolvedValueOnce(redirectResponse('https://example.com/b'))
			.mockResolvedValueOnce(redirectResponse('https://example.com/c'))
			.mockResolvedValueOnce(okResponse());
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 5 })(next);

		const response = await fetch({
			url: 'https://example.com/a',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledTimes(3);
		expect(next.mock.calls[0]?.[0].url).toBe('https://example.com/a');
		expect(next.mock.calls[1]?.[0].url).toBe('https://example.com/b');
		expect(next.mock.calls[2]?.[0].url).toBe('https://example.com/c');
	});

	it('rejects when the redirect cap is exceeded', async () => {
		const next = vi
			.fn<Fetch>()
			.mockResolvedValue(redirectResponse('https://example.com/loop'));
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 2 })(next);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Redirect limit exceeded (2)');
	});

	it('rejects with timeout error when next exceeds the deadline', async () => {
		const next = vi.fn<Fetch>().mockImplementation(
			() =>
				new Promise<WebFetchResponse>((resolve) => {
					setTimeout(() => resolve(okResponse()), 500);
				}),
		);
		const fetch = withBounded({ timeoutMs: 50, maxRedirects: 0 })(next);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Request timed out after 50ms');
	});

	it('rejects when redirect response is missing Location header', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue({
			url: 'https://example.com/',
			status: 302,
			statusText: 'Found',
			headers: {},
			body: new Uint8Array(),
		});
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 5 })(next);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Redirect response missing Location header');
	});

	it('rejects non-http(s) redirect targets', async () => {
		const next = vi
			.fn<Fetch>()
			.mockResolvedValue(redirectResponse('javascript:alert(1)'));
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 5 })(next);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Only HTTP and HTTPS URLs are supported');
	});
});

describe('withBounded + withPolicy composition', () => {
	it('denies redirects from public hosts to loopback unless explicitly allowlisted', async () => {
		const transport = vi.fn<Fetch>();
		transport.mockResolvedValueOnce(
			redirectResponse('http://localhost:11434/api/tags'),
		);
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 5 })(
			withPolicy({ allowedDomains: [], deniedDomains: [] })(transport),
		);

		await expect(
			fetch({ url: 'https://example.com/', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "localhost"');
		expect(transport).toHaveBeenCalledOnce();
	});

	it('allows redirects to loopback when the target is explicitly allowlisted', async () => {
		const transport = vi.fn<Fetch>();
		transport
			.mockResolvedValueOnce(
				redirectResponse('http://localhost:11434/api/tags'),
			)
			.mockResolvedValueOnce(okResponse());
		const fetch = withBounded({ timeoutMs: 5000, maxRedirects: 5 })(
			withPolicy({
				allowedDomains: ['example.com', 'localhost:11434'],
				deniedDomains: [],
			})(transport),
		);

		const response = await fetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(transport).toHaveBeenCalledTimes(2);
	});
});
