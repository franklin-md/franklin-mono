import { normalizeHost } from './normalize-host.js';
import { isIPv4 } from './is-ipv4.js';

/** Exact hosts and strict subdomains, as in Anthropic's domain rules. */
// https://github.com/anthropics/sandbox-runtime/blob/v0.0.83/src/sandbox/domain-pattern.ts
export function matchesDomain(pattern: string, host: string): boolean {
	if (pattern === '*') return true; // Franklin extension: public and private hosts.
	if (pattern.startsWith('*.')) {
		// Wildcards never match the root or IP literals.
		return (
			!host.includes(':') &&
			!isIPv4(host) &&
			host.endsWith(`.${normalizeHost(pattern.slice(2))}`)
		);
	}
	return host === normalizeHost(pattern);
}
