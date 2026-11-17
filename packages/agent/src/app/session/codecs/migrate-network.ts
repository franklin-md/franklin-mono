import {
	isPrivateHost,
	isLoopbackHost,
	normalizeHost,
	parseIPv4,
	type NetworkPermissions,
} from '@franklin/lib';

/** One-time conversion of pre-v4 web policy; never infer legacy semantics for live configs. */
export function migrateNetworkPermissions(
	legacy: NetworkPermissions,
): NetworkPermissions {
	const allowsAll = legacy.allowedDomains.some((pattern) =>
		['', '*'].includes(pattern.trim()),
	);
	const deniesLocalhostTree = legacy.deniedDomains.some((pattern) =>
		['localhost', '*.localhost'].includes(pattern.trim().toLowerCase()),
	);
	const allowedDomains = legacy.allowedDomains
		.flatMap((pattern) => expandLegacyPattern(pattern, true))
		.filter((pattern) => {
			// Native validation rejects *.localhost. The public fallback already
			// excludes .localhost; remove explicit allows underneath a legacy deny
			// of that tree so migrating its root cannot grant formerly denied access.
			const host = pattern.replace(/:[0-9]+$/, '');
			return !deniesLocalhostTree || !host.endsWith('.localhost');
		});
	return {
		allowedDomains: [
			...new Set([
				...allowedDomains,
				...(allowsAll ? ['localhost', '127.0.0.1', '[::1]'] : []),
			]),
		],
		deniedDomains: [
			...new Set(
				legacy.deniedDomains.flatMap((pattern) =>
					expandLegacyPattern(pattern, false),
				),
			),
		],
		...(legacy.allowedDomains.length === 0 || allowsAll
			? { allowPublicHosts: true }
			: {}),
	};
}

function expandLegacyPattern(pattern: string, allow: boolean): string[] {
	const normalized = pattern.trim().toLowerCase();
	if (normalized === '' || normalized === '*') return allow ? [] : ['*'];
	// Legacy host:port entries were exact. In particular, do not expand their
	// deny coverage to subdomains when converting the host-only patterns below.
	const hostPort = /^(\[[^\]]+\]|[^:]+):[0-9]+$/.exec(normalized);
	if (hostPort?.[1]) {
		// Wildcard host:port rules never matched in the legacy URL matcher.
		if (hostPort[1].startsWith('*.')) return [];
		return allow &&
			wasLegacyPrivate(hostPort[1]) &&
			!isLoopbackHost(hostPort[1])
			? []
			: [normalized];
	}
	const host = normalized.startsWith('*.') ? normalized.slice(2) : normalized;
	// Single-label localhost cannot have a native strict-subdomain wildcard.
	// Keep its exact service access; migration deliberately narrows that alias tree.
	if (host === 'localhost') return ['localhost'];
	const canonical = normalizeHost(host);
	if (canonical.includes(':')) {
		return allow && wasLegacyPrivate(canonical) && !isLoopbackHost(canonical)
			? []
			: [`[${canonical}]`];
	}
	// The old web guard never allowed non-loopback private literals, even when
	// listed. Removing those inert allows avoids granting new private access.
	const root =
		allow && wasLegacyPrivate(host) && !isLoopbackHost(host) ? [] : [host];
	return parseIPv4(host) ? root : [...root, `*.${host}`];
}

// Preserve which explicit allows the old guard ignored. Do not use the new
// public fallback's broader .localhost / mapped-IPv6 classification here.
function wasLegacyPrivate(host: string): boolean {
	const normalized = normalizeHost(host);
	return parseIPv4(normalized) !== null
		? isPrivateHost(normalized)
		: ['localhost', '::', '::1'].includes(normalized) ||
				normalized.startsWith('fe80:') ||
				normalized.startsWith('fc') ||
				normalized.startsWith('fd');
}
