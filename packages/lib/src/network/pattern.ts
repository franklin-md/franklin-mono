interface NetworkPattern {
	host: string;
	port?: number;
}

// Mirrors SRT's exact / strict-subdomain rules and bracketed IPv6 syntax.
// https://github.com/anthropics/sandbox-runtime/blob/main/src/sandbox/domain-pattern.ts
export function parseNetworkPattern(
	pattern: string,
): NetworkPattern | undefined {
	const match = /^(\[[^\]]+\]|[^:]+)(?::([1-9][0-9]{0,4}))?$/.exec(pattern);
	const rawHost = match?.[1];
	if (!match || rawHost === undefined) return undefined;
	const port = match[2] === undefined ? undefined : Number(match[2]);
	if (port !== undefined && port > 65535) return undefined;
	let host = rawHost.toLowerCase();
	if (host.startsWith('[')) {
		try {
			host = new URL(`http://${host}/`).hostname;
			if (!host.includes(':')) return undefined;
		} catch {
			return undefined;
		}
	} else if (host !== '*' && host !== 'localhost') {
		const domain = host.startsWith('*.') ? host.slice(2) : host;
		if (
			!domain.includes('.') ||
			!domain
				.split('.')
				.every((part) => /^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/.test(part))
		)
			return undefined;
	}
	return { host, port };
}
