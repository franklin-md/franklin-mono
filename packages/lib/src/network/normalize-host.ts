/** Canonical hostname or IP literal; accepts no URL components or port suffix. */
export function normalizeHost(host: string): string | undefined {
	if (!host || /[\s/@?#\\%*]/.test(host)) return undefined;
	if (host.startsWith('[') && !host.endsWith(']')) return undefined;
	try {
		// Proxy callbacks use bare IPv6; URL.hostname uses brackets. URL also
		// canonicalizes IPv6 and numeric IPv4 aliases such as 127.1.
		const bracketed =
			host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
		const url = new URL(`http://${bracketed}/`);
		if (url.port) return undefined;
		return url.hostname
			.replace(/^\[|\]$/g, '')
			.replace(/\.$/, '')
			.toLowerCase();
	} catch {
		return undefined;
	}
}
