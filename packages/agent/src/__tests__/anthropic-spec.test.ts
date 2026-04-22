import type { Fetch } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { anthropicSpec } from '../auth/specs/anthropic.js';

describe('anthropicSpec', () => {
	it('pins the canonical callback port and path', () => {
		expect(anthropicSpec.loopback).toEqual({ port: 53692, path: '/callback' });
	});

	it('buildAuthUrl includes required PKCE params and uses verifier as state', () => {
		const url = new URL(
			anthropicSpec.buildAuthUrl(
				{ verifier: 'v', challenge: 'c', state: 'unused' },
				'http://localhost:53692/callback',
			),
		);
		expect(url.origin + url.pathname).toBe('https://claude.ai/oauth/authorize');
		expect(url.searchParams.get('code')).toBe('true');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('code_challenge')).toBe('c');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('state')).toBe('v');
		expect(url.searchParams.get('redirect_uri')).toBe(
			'http://localhost:53692/callback',
		);
	});

	it('validateState compares received state against the verifier', () => {
		const pkce = { verifier: 'v-abc', challenge: 'c', state: 's' };
		expect(anthropicSpec.validateState!(pkce, 'v-abc')).toBe(true);
		expect(anthropicSpec.validateState!(pkce, 's')).toBe(false);
	});

	it('exchangeCode POSTs JSON with the expected grant_type and fields', async () => {
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			url: 'https://platform.claude.com/v1/oauth/token',
			status: 200,
			statusText: 'OK',
			headers: {},
			body: new TextEncoder().encode(
				JSON.stringify({
					access_token: 'A',
					refresh_token: 'R',
					expires_in: 3600,
				}),
			),
		});

		await anthropicSpec.exchangeCode(
			'code-xyz',
			'verifier-123',
			'http://localhost:53692/callback',
			fetch,
		);

		const request = fetch.mock.calls[0]![0];
		expect(request.method).toBe('POST');
		expect(request.headers?.['Content-Type']).toBe('application/json');
		const body = JSON.parse(new TextDecoder().decode(request.body)) as Record<
			string,
			unknown
		>;
		expect(body).toMatchObject({
			grant_type: 'authorization_code',
			code: 'code-xyz',
			code_verifier: 'verifier-123',
			redirect_uri: 'http://localhost:53692/callback',
		});
	});

	it('exchangeCode subtracts the 5-minute buffer from expires_in', async () => {
		const start = Date.now();
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			url: '',
			status: 200,
			statusText: 'OK',
			headers: {},
			body: new TextEncoder().encode(
				JSON.stringify({
					access_token: 'A',
					refresh_token: 'R',
					expires_in: 3600,
				}),
			),
		});
		const creds = await anthropicSpec.exchangeCode(
			'c',
			'v',
			'http://localhost:53692/callback',
			fetch,
		);
		const expected = start + 3600 * 1000 - 5 * 60 * 1000;
		expect(creds.expires).toBeGreaterThanOrEqual(expected - 50);
		expect(creds.expires).toBeLessThanOrEqual(expected + 50);
	});

	it('refresh POSTs JSON with grant_type=refresh_token', async () => {
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			url: '',
			status: 200,
			statusText: 'OK',
			headers: {},
			body: new TextEncoder().encode(
				JSON.stringify({
					access_token: 'A2',
					refresh_token: 'R2',
					expires_in: 3600,
				}),
			),
		});

		await anthropicSpec.refresh(
			{ access: 'old-a', refresh: 'old-r', expires: 0 },
			fetch,
		);

		const body = JSON.parse(
			new TextDecoder().decode(fetch.mock.calls[0]![0].body),
		) as Record<string, unknown>;
		expect(body.grant_type).toBe('refresh_token');
		expect(body.refresh_token).toBe('old-r');
	});

	it('exchangeCode throws on non-2xx response', async () => {
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			url: '',
			status: 400,
			statusText: 'Bad Request',
			headers: {},
			body: new TextEncoder().encode('{"error":"invalid_grant"}'),
		});
		await expect(
			anthropicSpec.exchangeCode('c', 'v', '/cb', fetch),
		).rejects.toThrow(/400/);
	});

	it('getApiKey returns the access token', () => {
		expect(
			anthropicSpec.getApiKey({ access: 'A', refresh: 'R', expires: 0 }),
		).toBe('A');
	});
});
