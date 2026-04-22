import type { Fetch, NetworkPermissions } from '../types.js';
import type { FetchDecorator } from './types.js';
import {
	isLoopbackHost,
	isPrivateHost,
	matchesUrlPattern,
	normalizeHost,
} from '../utils.js';

/**
 * Throws if the URL's host is not allowed by the given permissions. Pure
 * guard — does not mutate the request. Placed inside withRedirect so that
 * every hop re-invokes the check via the next() call.
 */
export function withPolicy(permissions: NetworkPermissions): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			assertAllowed(new URL(request.url), permissions);
			return next(request);
		};
}

export function assertAllowed(url: URL, permissions: NetworkPermissions): void {
	const host = normalizeHost(url.hostname);

	const denied = permissions.deniedDomains.some((pattern) =>
		matchesUrlPattern(pattern, url),
	);
	if (denied) {
		throw new Error(`Network access denied for host "${host}"`);
	}

	if (isLoopbackHost(host)) {
		const allowed = permissions.allowedDomains.some((pattern) =>
			matchesUrlPattern(pattern, url),
		);
		if (!allowed) {
			throw new Error(
				`Network access denied for host "${host}": loopback addresses must be explicitly allowlisted`,
			);
		}
		return;
	}

	// Block private/link-local addresses to prevent SSRF.
	// Partial mitigation against domain fronting via IP literals
	// (e.g. http://192.168.1.1/). DNS-based fronting via CDN hostnames that
	// resolve to private IPs cannot be caught here.
	if (isPrivateHost(host)) {
		throw new Error(`Network access denied for host "${host}"`);
	}

	if (
		permissions.allowedDomains.length > 0 &&
		!permissions.allowedDomains.some((pattern) =>
			matchesUrlPattern(pattern, url),
		)
	) {
		throw new Error(`Network access denied for host "${host}"`);
	}
}
