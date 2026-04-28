import { base64urlToBase64 } from '@franklin/lib';

import { postOAuthTokenRequest } from './token-request.js';
import type { AuthorizationCodePkceSpec } from './types.js';

// Values sourced from @mariozechner/pi-ai:
// node_modules/@mariozechner/pi-ai/dist/utils/oauth/openai-codex.js
//
// We reuse pi-ai's registered OAuth client, so every field below must match
// pi-ai's exact request shape — including `originator` and the exact
// redirect URI string. Deviating breaks auth (e.g. setting
// originator=franklin yields a generic "unknown_error" pre-consent because
// the value isn't in the allowlist for this client_id).
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize';
const TOKEN_URL = 'https://auth.openai.com/oauth/token';
const CALLBACK_PORT = 1455;
const CALLBACK_PATH = '/auth/callback';
// Registered redirect URI uses "localhost". The listener binds 127.0.0.1
// for security; browser redirect to localhost resolves to that loopback.
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
const SCOPE = 'openid profile email offline_access';
// JWT claim path carrying chatgpt_account_id on the access token.
const JWT_CLAIM_PATH = 'https://api.openai.com/auth';
// Must be a value that's been allowlisted against this client_id by OpenAI.
// pi-ai registered "pi"; no other values are accepted.
const ORIGINATOR = 'pi';

export const openaiCodexSpec: AuthorizationCodePkceSpec = {
	id: 'openai-codex',
	name: 'ChatGPT',
	loopback: { port: CALLBACK_PORT, path: CALLBACK_PATH },
	redirectUri: REDIRECT_URI,

	buildAuthUrl(params, redirectUri) {
		const url = new URL(AUTHORIZE_URL);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('client_id', CLIENT_ID);
		url.searchParams.set('redirect_uri', redirectUri);
		url.searchParams.set('scope', SCOPE);
		url.searchParams.set('code_challenge', params.challenge);
		url.searchParams.set('code_challenge_method', 'S256');
		url.searchParams.set('state', params.state);
		url.searchParams.set('id_token_add_organizations', 'true');
		url.searchParams.set('codex_cli_simplified_flow', 'true');
		url.searchParams.set('originator', ORIGINATOR);
		return url.toString();
	},

	async exchangeCode(code, verifier, redirectUri, fetch) {
		return postOAuthTokenRequest(fetch, {
			url: TOKEN_URL,
			body: {
				grant_type: 'authorization_code',
				client_id: CLIENT_ID,
				code,
				code_verifier: verifier,
				redirect_uri: redirectUri,
			},
			encoding: 'form',
			providerLabel: 'OpenAI Codex',
			getAccountId: extractAccountId,
		});
	},

	async refresh(credentials, fetch) {
		return postOAuthTokenRequest(fetch, {
			url: TOKEN_URL,
			body: {
				grant_type: 'refresh_token',
				client_id: CLIENT_ID,
				refresh_token: credentials.refresh,
			},
			encoding: 'form',
			providerLabel: 'OpenAI Codex',
			getAccountId: extractAccountId,
		});
	},

	getApiKey(credentials) {
		return credentials.access;
	},
};

function extractAccountId(accessToken: string): string | undefined {
	const parts = accessToken.split('.');
	if (parts.length !== 3) return undefined;
	const payloadSegment = parts[1];
	if (!payloadSegment) return undefined;
	let payloadJson: string;
	try {
		payloadJson = atob(base64urlToBase64(payloadSegment));
	} catch {
		return undefined;
	}
	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(payloadJson) as Record<string, unknown>;
	} catch {
		return undefined;
	}
	const claim = payload[JWT_CLAIM_PATH];
	if (!claim || typeof claim !== 'object') return undefined;
	const accountId = (claim as Record<string, unknown>).chatgpt_account_id;
	return typeof accountId === 'string' && accountId.length > 0
		? accountId
		: undefined;
}
