import { describe, expect, it, vi } from 'vitest';
import type { Fetch, WebFetchResponse } from '../types.js';
import { withDefaults } from '../defaults.js';

function okResponse(): WebFetchResponse {
	return {
		url: 'https://example.com/',
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withDefaults', () => {
	it('applies a default user-agent', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withDefaults(next);

		await fetch({ url: 'https://example.com/', method: 'GET' });

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['user-agent']).toMatch(/Franklin/);
	});

	it('lowercases header keys', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withDefaults(next);

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
		const fetch = withDefaults(next);

		await fetch({
			url: 'https://example.com/',
			method: 'GET',
			headers: { 'User-Agent': 'my-agent/1.0' },
		});

		const call = next.mock.calls[0]?.[0];
		expect(call?.headers?.['user-agent']).toBe('my-agent/1.0');
	});
});
