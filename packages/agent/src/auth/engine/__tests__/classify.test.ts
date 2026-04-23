import type { LoopbackRequest, PkceParams } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import type { AuthorizationCodePkceSpec } from '../../specs/types.js';
import { classifyCallback } from '../classify.js';

const pkce: PkceParams = {
	verifier: 'verifier-123',
	challenge: 'challenge-123',
	state: 'state-123',
};

function makeSpec(
	overrides: Partial<AuthorizationCodePkceSpec> = {},
): AuthorizationCodePkceSpec {
	return {
		id: 'test',
		name: 'Test',
		loopback: { path: '/callback' },
		redirectUri: 'http://localhost:9999/callback',
		buildAuthUrl: () => 'https://provider.example/authorize',
		exchangeCode: vi.fn(),
		refresh: vi.fn(),
		getApiKey: (creds) => creds.access,
		...overrides,
	};
}

function makeRequest(pathAndQuery: string): LoopbackRequest {
	return {
		id: 'req-1',
		method: 'GET',
		url: `http://127.0.0.1:9999${pathAndQuery}`,
		headers: {},
	};
}

describe('classifyCallback', () => {
	it('ignores requests on unmatched paths with a 404', () => {
		const outcome = classifyCallback(
			makeRequest('/favicon.ico'),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('ignore');
		expect(outcome.response.status).toBe(404);
	});

	it('returns error outcome when callback carries an ?error param', () => {
		const outcome = classifyCallback(
			makeRequest(
				'/callback?error=access_denied&error_description=User%20declined',
			),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('error');
		if (outcome.kind !== 'error') return;
		expect(outcome.error.message).toMatch(/User declined/);
		expect(outcome.response.status).toBe(400);
	});

	it('falls back to error param name when error_description is absent', () => {
		const outcome = classifyCallback(
			makeRequest('/callback?error=access_denied'),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('error');
		if (outcome.kind !== 'error') return;
		expect(outcome.error.message).toMatch(/access_denied/);
	});

	it('returns error when code is missing', () => {
		const outcome = classifyCallback(
			makeRequest('/callback?state=state-123'),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('error');
		if (outcome.kind !== 'error') return;
		expect(outcome.error.message).toMatch(/missing code or state/i);
	});

	it('returns error when state is missing', () => {
		const outcome = classifyCallback(
			makeRequest('/callback?code=auth-code'),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('error');
	});

	it('returns error on state mismatch with default validator', () => {
		const outcome = classifyCallback(
			makeRequest('/callback?code=auth-code&state=wrong'),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('error');
		if (outcome.kind !== 'error') return;
		expect(outcome.error.message).toMatch(/state mismatch/i);
	});

	it('returns success with the authorization code on valid callback', () => {
		const outcome = classifyCallback(
			makeRequest('/callback?code=auth-code&state=state-123'),
			pkce,
			makeSpec(),
		);
		expect(outcome.kind).toBe('success');
		if (outcome.kind !== 'success') return;
		expect(outcome.code).toBe('auth-code');
		expect(outcome.response.status).toBe(200);
	});

	it('uses spec.validateState override (Anthropic-style verifier-as-state)', () => {
		const spec = makeSpec({
			validateState: (expected, received) => received === expected.verifier,
		});
		const outcome = classifyCallback(
			makeRequest(`/callback?code=auth-code&state=${pkce.verifier}`),
			pkce,
			spec,
		);
		expect(outcome.kind).toBe('success');
	});

	it('honors a custom loopback path', () => {
		const spec = makeSpec({ loopback: { path: '/oauth/cb' } });
		expect(
			classifyCallback(
				makeRequest('/callback?code=x&state=state-123'),
				pkce,
				spec,
			).kind,
		).toBe('ignore');
		expect(
			classifyCallback(
				makeRequest('/oauth/cb?code=x&state=state-123'),
				pkce,
				spec,
			).kind,
		).toBe('success');
	});
});
