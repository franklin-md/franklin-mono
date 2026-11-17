import type { NetworkPermissions } from './types.js';
import { normalizeHost } from './normalize-host.js';
import { isPrivateHost } from './is-private-host.js';
import { matchesDomain } from './matches-domain.js';

/** Shared host decision for validated configuration. Allowed hosts cover all ports. */
export function networkAllowed(
	host: string,
	permissions: NetworkPermissions,
): boolean {
	const normalized = normalizeHost(host);
	if (!normalized) return false;
	if (
		permissions.deniedDomains.some((pattern) =>
			matchesDomain(pattern, normalized),
		)
	)
		return false;
	if (
		permissions.allowedDomains.some((pattern) =>
			matchesDomain(pattern, normalized),
		)
	)
		return true;
	// Host/literal classification only: an allowed DNS name may still resolve
	// to a private address. DNS rebinding protection is outside this policy.
	return permissions.allowPublicHosts === true && !isPrivateHost(normalized);
}
