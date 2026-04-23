import type { LoopbackRequest, PkceParams } from '@franklin/lib';

import type { OAuthCredentials } from '../credentials.js';
import type { AuthorizationCodePkceSpec } from '../specs/types.js';
import { errorOutcome, ignoredOutcome, successOutcome } from './factory.js';
import type { CallbackOutcome } from './types.js';

/**
 * Pure classifier: turns a raw loopback request into a `CallbackOutcome`.
 *
 * The `ignore` outcome (typically 404 for unmatched paths like `/favicon.ico`)
 * is intentional — browsers opportunistically request siblings of the
 * callback URL, and those requests must not fail the OAuth flow.
 */
export function classifyCallback<TCreds extends OAuthCredentials>(
	request: LoopbackRequest,
	pkce: PkceParams,
	spec: AuthorizationCodePkceSpec<TCreds>,
): CallbackOutcome {
	const url = new URL(request.url);
	const expectedPath = spec.loopback.path ?? '/callback';
	if (url.pathname !== expectedPath) {
		return ignoredOutcome(404, 'Not found.');
	}

	const errorParam = url.searchParams.get('error');
	if (errorParam) {
		const description = url.searchParams.get('error_description') ?? errorParam;
		return errorOutcome(400, `Authentication failed: ${description}`);
	}

	const code = url.searchParams.get('code');
	const receivedState = url.searchParams.get('state');
	if (!code || !receivedState) {
		return errorOutcome(400, 'Missing code or state parameter.');
	}

	const stateValid = spec.validateState
		? spec.validateState(pkce, receivedState)
		: receivedState === pkce.state;
	if (!stateValid) {
		return errorOutcome(400, 'State mismatch.');
	}

	return successOutcome(code);
}
