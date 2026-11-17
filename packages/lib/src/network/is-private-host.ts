import { isIPv4 } from './is-ipv4.js';

/** Classifies a canonical host from normalizeHost; does not resolve DNS. */
export function isPrivateHost(host: string): boolean {
	if (
		host === 'localhost' ||
		host.endsWith('.localhost') ||
		host === '::' ||
		host === '::1'
	)
		return true;
	if (isIPv4(host)) {
		const [a, b] = host.split('.').map(Number) as [
			number,
			number,
			number,
			number,
		];
		return (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 100 && b >= 64 && b <= 127) || // shared address space
			(a === 169 && b === 254) || // link-local
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168)
		);
	}
	// URL renders IPv4-mapped IPv6 as two hex groups. Classify the embedded
	// address too, so ::ffff:192.168.1.1 cannot enter the public fallback.
	const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(host);
	if (mapped?.[1] && mapped[2]) {
		const high = parseInt(mapped[1], 16);
		const low = parseInt(mapped[2], 16);
		return isPrivateHost(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
	}
	// fe80::/10 is link-local; fc00::/7 is unique-local. Require an IPv6
	// separator so ordinary names starting with "fc" or "fd" stay public.
	return host.includes(':') && (/^fe[89ab]/.test(host) || /^f[cd]/.test(host));
}
