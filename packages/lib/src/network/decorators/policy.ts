import type { Fetch, NetworkPermissions } from '../types.js';
import { validateNetworkPermissions } from '../validate.js';
import type { FetchDecorator } from './types.js';
import { isPrivateHost, matchesUrlPattern, normalizeHost } from '../utils.js';

/**
 * Throws if the URL's host is not allowed by the given permissions. Pure
 * guard — does not mutate the request. Placed inside withRedirect so that
 * every hop re-invokes the check via the next() call.
 */
export function withPolicy(permissions: NetworkPermissions): FetchDecorator {
	validateNetworkPermissions(permissions);
	return (next: Fetch): Fetch =>
		async (request) => {
			assertAllowed(new URL(request.url), permissions);
			return next(request);
		};
}

export function assertAllowed(url: URL, permissions: NetworkPermissions): void {
	validateNetworkPermissions(permissions);
	const host = normalizeHost(url.hostname);

	const denied = permissions.deniedDomains.some((pattern) =>
		matchesUrlPattern(pattern, url),
	);
	if (denied) {
		throw new Error(`Network access denied for host "${host}"`);
	}

	if (
		permissions.allowedDomains.some((pattern) =>
			matchesUrlPattern(pattern, url),
		)
	)
		return;

	// This optional fallback is a host/literal check, not DNS rebinding protection.
	// Explicit allow rules can name private services, just as native SRT rules do.
	if (permissions.allowPublicHosts && !isPrivateHost(host)) return;
	throw new Error(`Network access denied for host "${host}"`);
}
