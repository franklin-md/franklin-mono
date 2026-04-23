import { generatePkceParams } from '@franklin/lib';

import type { Net } from '../../platform.js';
import type { OAuthCredentials } from '../credentials.js';
import type { AuthorizationCodePkceSpec } from '../specs/types.js';
import type { OAuthLoginCallbacks } from '../types.js';
import { awaitAuthorizationCode } from './await-callback.js';

export async function runAuthorizationCodePkce<TCreds extends OAuthCredentials>(
	spec: AuthorizationCodePkceSpec<TCreds>,
	net: Net,
	callbacks: OAuthLoginCallbacks,
	signal?: AbortSignal,
): Promise<TCreds> {
	signal?.throwIfAborted();
	const pkce = await generatePkceParams();
	const listener = await net.listenLoopback(spec.loopback);

	try {
		// Use the spec's literal redirectUri — NOT listener.getRedirectUri() —
		// because providers allowlist redirect URIs as exact strings. The bind
		// host (127.0.0.1) is typically different from the advertised host
		// (localhost) that the client was registered against.
		const authorizeUrl = spec.buildAuthUrl(pkce, spec.redirectUri);
		callbacks.onAuth({
			url: authorizeUrl,
			instructions: 'Complete login in your browser to continue.',
		});

		const { code } = await awaitAuthorizationCode(listener, pkce, spec, signal);

		callbacks.onProgress?.('Exchanging authorization code for tokens…');
		return await spec.exchangeCode(
			code,
			pkce.verifier,
			spec.redirectUri,
			net.fetch,
		);
	} finally {
		await listener.dispose();
	}
}
