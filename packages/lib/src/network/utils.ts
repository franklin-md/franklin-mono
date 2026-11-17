import { parseNetworkPattern } from './pattern.js';

export function normalizeUrl(rawUrl: string): string {
	const url = new URL(rawUrl);
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error('Only HTTP and HTTPS URLs are supported');
	}
	if (url.protocol === 'http:' && !isPrivateHost(url.hostname)) {
		url.protocol = 'https:';
	}
	url.hash = '';
	return url.toString();
}

export function isPrivateHost(host: string): boolean {
	const stripped = normalizeHost(host);

	if (
		stripped === 'localhost' ||
		stripped.endsWith('.localhost') ||
		stripped === '0.0.0.0' ||
		stripped === '::' ||
		stripped === '::1'
	) {
		return true;
	}

	const ipv4 = parseIPv4(stripped);
	if (ipv4 !== null) {
		const [a, b] = ipv4;
		return (
			a === 0 || // unspecified
			a === 10 || // RFC1918
			a === 127 || // loopback
			(a === 100 && b >= 64 && b <= 127) || // shared address space (RFC6598)
			(a === 169 && b === 254) || // link-local
			(a === 172 && b >= 16 && b <= 31) || // RFC1918
			(a === 192 && b === 168) // RFC1918
		);
	}

	// URL canonicalization renders IPv4-mapped IPv6 as two hex groups.
	const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(stripped);
	if (mapped?.[1] && mapped[2]) {
		const high = parseInt(mapped[1], 16);
		const low = parseInt(mapped[2], 16);
		return isPrivateHost(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
	}
	return (
		stripped.includes(':') &&
		(/^fe[89ab]/.test(stripped) || /^f[cd]/.test(stripped))
	);
}

export function isLoopbackHost(host: string): boolean {
	const normalized = normalizeHost(host);
	return (
		normalized === 'localhost' ||
		normalized === '127.0.0.1' ||
		normalized === '::1'
	);
}

export function parseIPv4(
	host: string,
): [number, number, number, number] | null {
	const parts = host.split('.');
	if (parts.length !== 4) return null;
	const nums = parts.map(Number);
	if (nums.some((n) => isNaN(n) || n < 0 || n > 255 || !Number.isInteger(n))) {
		return null;
	}
	return nums as [number, number, number, number];
}

export function normalizeHost(host: string): string {
	try {
		const bracketed =
			host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
		return new URL(`http://${bracketed}/`).hostname
			.replace(/^\[|\]$/g, '')
			.replace(/\.$/, '')
			.toLowerCase();
	} catch {
		return host.toLowerCase();
	}
}

export function matchesDomain(pattern: string, host: string): boolean {
	const normalized = normalizeHost(host);
	if (pattern === '*') return true;
	if (pattern.startsWith('*.')) {
		return (
			!normalized.includes(':') &&
			parseIPv4(normalized) === null &&
			normalized.endsWith(`.${pattern.slice(2).toLowerCase()}`)
		);
	}
	return normalized === normalizeHost(pattern);
}

export function matchesUrlPattern(pattern: string, url: URL): boolean {
	const parsed = parseNetworkPattern(pattern);
	if (!parsed) return false;
	const port =
		url.port ||
		(url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : '');
	return (
		(parsed.port === undefined || parsed.port === Number(port)) &&
		matchesDomain(parsed.host, url.hostname)
	);
}
