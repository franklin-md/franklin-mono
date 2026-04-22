import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../../types.js';
import { withUserAgent } from '../user-agent.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withUserAgent', () => {
	it('applies a default user-agent when none is provided', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withUserAgent()(next);

		await fetch({ url: 'https://example.com/', method: 'GET' });

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['user-agent']).toMatch(/Franklin/);
	});

	it('preserves a caller user-agent over the default', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withUserAgent()(next);

		await fetch({
			url: 'https://example.com/',
			method: 'GET',
			headers: { 'User-Agent': 'my-agent/1.0' },
		});

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['User-Agent']).toBe('my-agent/1.0');
		expect(call?.headers?.['user-agent']).toBeUndefined();
	});

	it('accepts a custom default', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withUserAgent('custom/9.9')(next);

		await fetch({ url: 'https://example.com/', method: 'GET' });

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['user-agent']).toBe('custom/9.9');
	});
});
