import type { Fetch, ListenLoopbackOptions, PkceParams } from '@franklin/lib';

import type { OAuthCredentials } from '../credentials.js';

export interface AuthorizationCodePkceSpec<
	TCreds extends OAuthCredentials = OAuthCredentials,
> {
	readonly id: string;
	readonly name: string;
	// Bind parameters for the local callback server. Host defaults to 127.0.0.1.
	readonly loopback: ListenLoopbackOptions;
	// Literal redirect URI advertised to the provider (and echoed in the token
	// exchange). Must match the client's registered allowlist *exactly* — this
	// is often a different host string than the bind host (e.g. "localhost" vs
	// "127.0.0.1"). Decoupled from the listener's bound URI for that reason.
	readonly redirectUri: string;
	buildAuthUrl(params: PkceParams, redirectUri: string): string;
	exchangeCode(
		code: string,
		verifier: string,
		redirectUri: string,
		fetch: Fetch,
	): Promise<TCreds>;
	refresh(credentials: TCreds, fetch: Fetch): Promise<TCreds>;
	getApiKey(credentials: TCreds): string;
	validateState?(expected: PkceParams, received: string): boolean;
}
