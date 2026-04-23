import type { Fetch } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { openaiCodexSpec } from '../auth/specs/openai-codex.js';

function base64url(input: string): string {
	return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwt(payload: Record<string, unknown>): string {
	const header = base64url(JSON.stringify({ alg: 'none' }));
	const body = base64url(JSON.stringify(payload));
	return `${header}.${body}.sig`;
}

describe('openaiCodexSpec', () => {
	it('pins port 1455 and /auth/callback', () => {
		expect(openaiCodexSpec.loopback).toEqual({
			port: 1455,
			path: '/auth/callback',
		});
	});

	it('buildAuthUrl includes PKCE, state, and codex-specific params', () => {
		const url = new URL(
			openaiCodexSpec.buildAuthUrl(
				{ verifier: 'v', challenge: 'c', state: 's-state' },
				'http://localhost:1455/auth/callback',
			),
		);
		expect(url.origin + url.pathname).toBe(
			'https://auth.openai.com/oauth/authorize',
		);
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('code_challenge')).toBe('c');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('state')).toBe('s-state');
		expect(url.searchParams.get('id_token_add_organizations')).toBe('true');
		expect(url.searchParams.get('codex_cli_simplified_flow')).toBe('true');
		// Must match pi-ai's registered originator; this client_id has no other allowlisted values.
		expect(url.searchParams.get('originator')).toBe('pi');
	});

	it('exchangeCode POSTs form-urlencoded body', async () => {
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

		await openaiCodexSpec.exchangeCode(
			'c-abc',
			'v-123',
			'http://localhost:1455/auth/callback',
			fetch,
		);

		const request = fetch.mock.calls[0]![0];
		expect(request.headers?.['Content-Type']).toBe(
			'application/x-www-form-urlencoded',
		);
		const bodyText = new TextDecoder().decode(request.body);
		const params = new URLSearchParams(bodyText);
		expect(params.get('grant_type')).toBe('authorization_code');
		expect(params.get('code')).toBe('c-abc');
		expect(params.get('code_verifier')).toBe('v-123');
		expect(params.get('redirect_uri')).toBe(
			'http://localhost:1455/auth/callback',
		);
	});

	it('exchangeCode extracts accountId from the access token JWT', async () => {
		const token = jwt({
			'https://api.openai.com/auth': { chatgpt_account_id: 'acct-42' },
		});
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			url: '',
			status: 200,
			statusText: 'OK',
			headers: {},
			body: new TextEncoder().encode(
				JSON.stringify({
					access_token: token,
					refresh_token: 'R',
					expires_in: 3600,
				}),
			),
		});

		const creds = await openaiCodexSpec.exchangeCode('c', 'v', '/cb', fetch);

		expect(creds.accountId).toBe('acct-42');
	});

	it('exchangeCode omits accountId when the claim is absent', async () => {
		const token = jwt({ other: 'value' });
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			url: '',
			status: 200,
			statusText: 'OK',
			headers: {},
			body: new TextEncoder().encode(
				JSON.stringify({
					access_token: token,
					refresh_token: 'R',
					expires_in: 3600,
				}),
			),
		});

		const creds = await openaiCodexSpec.exchangeCode('c', 'v', '/cb', fetch);

		expect(creds.accountId).toBeUndefined();
	});

	it('refresh uses grant_type=refresh_token form-urlencoded', async () => {
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

		await openaiCodexSpec.refresh(
			{ access: 'old', refresh: 'old-r', expires: 0 },
			fetch,
		);

		const bodyText = new TextDecoder().decode(fetch.mock.calls[0]![0].body);
		const params = new URLSearchParams(bodyText);
		expect(params.get('grant_type')).toBe('refresh_token');
		expect(params.get('refresh_token')).toBe('old-r');
	});

	it('getApiKey returns the access token', () => {
		expect(
			openaiCodexSpec.getApiKey({ access: 'A', refresh: 'R', expires: 0 }),
		).toBe('A');
	});
});
