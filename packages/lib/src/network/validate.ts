import type { NetworkPermissions } from './types.js';
import { parseNetworkPattern } from './pattern.js';

/** Reject unsupported patterns rather than quietly broadening or narrowing access. */
export function validateNetworkPermissions(
	permissions: NetworkPermissions,
): void {
	for (const list of ['allowedDomains', 'deniedDomains'] as const) {
		for (const entry of permissions[list]) {
			const pattern = parseNetworkPattern(entry);
			if (!pattern || (list === 'allowedDomains' && pattern.host === '*')) {
				throw new Error(
					`Invalid network ${list} entry: ${JSON.stringify(entry)}`,
				);
			}
		}
	}
}
