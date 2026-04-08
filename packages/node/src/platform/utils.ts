
export function isPrivateHost(host: string): boolean {
	// Handle IPv6 bracket notation: [::1] -> ::1
	const stripped =
		host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

	if (
		stripped === 'localhost' ||
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

	const lower = stripped.toLowerCase();
	return (
		lower.startsWith('fe80:') || // link-local
		lower.startsWith('fc') || // ULA
		lower.startsWith('fd') // ULA
	);
}

export function parseIPv4(host: string): [number, number, number, number] | null {
	const parts = host.split('.');
	if (parts.length !== 4) return null;
	const nums = parts.map(Number);
	if (nums.some((n) => isNaN(n) || n < 0 || n > 255 || !Number.isInteger(n))) {
		return null;
	}
	return nums as [number, number, number, number];
}

export function matchesDomain(pattern: string, host: string): boolean {
	const normalized = pattern.trim().toLowerCase();
	if (normalized === '' || normalized === '*') {
		return true;
	}

	if (normalized.startsWith('*.')) {
		const suffix = normalized.slice(2);
		return host === suffix || host.endsWith(`.${suffix}`);
	}

	return host === normalized || host.endsWith(`.${normalized}`);
}
