import { postOAuthTokenRequest } from './token-request.js';
import type { AuthorizationCodePkceSpec } from './types.js';

// Values sourced from @mariozechner/pi-ai:
// node_modules/@mariozechner/pi-ai/dist/utils/oauth/anthropic.js
//
// We reuse pi-ai's registered OAuth client, so every field below must match
// pi-ai's exact request shape — the allowlist on Anthropic's side is keyed
// off the client_id. Deviating breaks auth (e.g. advertising 127.0.0.1
// instead of localhost yields "Redirect URI … is not supported by client").
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const AUTHORIZE_URL = 'https://claude.ai/oauth/authorize';
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token';
const CALLBACK_PORT = 53692;
const CALLBACK_PATH = '/callback';
// Registered redirect URI uses "localhost" (what pi-ai advertises). The
// listener binds 127.0.0.1:CALLBACK_PORT for security; localhost resolves
// to that same loopback interface in the browser, so the redirect works.
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
const SCOPES =
	'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload';

export const anthropicSpec: AuthorizationCodePkceSpec = {
	id: 'anthropic',
	name: 'Claude Pro/Max',
	loopback: { port: CALLBACK_PORT, path: CALLBACK_PATH },
	redirectUri: REDIRECT_URI,

	buildAuthUrl(params, redirectUri) {
		const query = new URLSearchParams({
			code: 'true',
			client_id: CLIENT_ID,
			response_type: 'code',
			redirect_uri: redirectUri,
			scope: SCOPES,
			code_challenge: params.challenge,
			code_challenge_method: 'S256',
			// Anthropic's flow uses the verifier as the state parameter.
			state: params.verifier,
		});
		return `${AUTHORIZE_URL}?${query.toString()}`;
	},

	validateState(expected, received) {
		return received === expected.verifier;
	},

	async exchangeCode(code, verifier, redirectUri, fetch) {
		return postOAuthTokenRequest(fetch, {
			url: TOKEN_URL,
			body: {
				grant_type: 'authorization_code',
				client_id: CLIENT_ID,
				code,
				state: verifier,
				redirect_uri: redirectUri,
				code_verifier: verifier,
			},
			encoding: 'json',
			providerLabel: 'Anthropic',
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
			encoding: 'json',
			providerLabel: 'Anthropic',
		});
	},

	getApiKey(credentials) {
		return credentials.access;
	},
};
