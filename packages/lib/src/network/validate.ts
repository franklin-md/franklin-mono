import type { NetworkPermissions } from './types.js';
import { normalizeHost } from './normalize-host.js';
import { isIPv4 } from './is-ipv4.js';

/** Reject unsupported patterns rather than quietly broadening or narrowing access. */
export function validateNetworkPermissions(
	permissions: NetworkPermissions,
): void {
	for (const list of ['allowedDomains', 'deniedDomains'] as const) {
		for (const entry of permissions[list]) {
			if (list === 'deniedDomains' && entry === '*') continue;
			if (!validDomain(entry)) {
				throw new Error(
					`Invalid network ${list} entry: ${JSON.stringify(entry)}`,
				);
			}
		}
	}
}

function validDomain(pattern: string): boolean {
	const wildcard = pattern.startsWith('*.');
	const value = wildcard ? pattern.slice(2) : pattern;
	const host = normalizeHost(value);
	if (!host) return false;
	// Rules use bracketed IPv6, never host:port. Destinations can use either
	// IPv6 spelling because fetch and the sandbox expose different spellings.
	if (host.includes(':'))
		return !wildcard && value.startsWith('[') && value.endsWith(']');
	if (!wildcard && host === 'localhost') return true;
	// No broad *.com / *.localhost rules, or wildcard IP addresses.
	return host.includes('.') && (!wildcard || !isIPv4(host));
}
