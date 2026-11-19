import type { Fetch } from '@franklin/lib';
import { describe, expect, it } from 'vitest';

import { TokenRequestError } from '../token-error.js';
import { postOAuthTokenRequest } from '../token-request.js';

function rejecting(status: number, body: string): Fetch {
	return async (request) => ({
		url: request.url,
		status,
		statusText: '',
		headers: {},
		body: new TextEncoder().encode(body),
	});
}

function request(fetch: Fetch) {
	return postOAuthTokenRequest(fetch, {
		url: 'https://example.com/token',
		body: { grant_type: 'refresh_token' },
		encoding: 'json',
		providerLabel: 'OpenAI Codex',
	});
}

describe('postOAuthTokenRequest', () => {
	it.each([
		[
			'a nested provider message',
			JSON.stringify({
				error: {
					message: 'Your refresh token has already been used.',
					type: 'invalid_request_error',
					code: 'refresh_token_reused',
				},
			}),
			'Your refresh token has already been used.',
		],
		[
			'an OAuth error description',
			JSON.stringify({
				error: 'invalid_grant',
				error_description: 'Refresh token expired',
			}),
			'Refresh token expired',
		],
		[
			'an OAuth error code',
			JSON.stringify({ error: 'invalid_grant' }),
			'invalid_grant',
		],
		['a plain-text body', 'Bad gateway', 'Bad gateway'],
	])('reports %s instead of the raw body', async (_case, body, detail) => {
		const error = await request(rejecting(401, body)).catch(
			(error: unknown) => error,
		);
		expect(error).toBeInstanceOf(TokenRequestError);
		expect(error).toMatchObject({
			status: 401,
			message: `OpenAI Codex token request failed (401): ${detail}`,
		});
	});
});
