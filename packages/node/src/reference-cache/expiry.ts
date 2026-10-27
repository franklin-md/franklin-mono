import { getHeader, type WebFetchResponse } from '@franklin/lib';

export function cacheExpiry(response: WebFetchResponse, ttlMs: number): number {
	// Keep this document cache small by bypassing variants, cookies and responses
	// requiring validation. Stale entries download again; conditional requests can
	// follow without changing reference handlers or the binary storage format.
	// See https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2
	const { headers } = response;
	const control = getHeader(headers, 'cache-control') ?? '';
	if (
		response.status !== 200 ||
		/(?:^|,)\s*(?:no-store|no-cache)\b/i.test(control) ||
		/\bno-cache\b/i.test(getHeader(headers, 'pragma') ?? '') ||
		getHeader(headers, 'vary') ||
		getHeader(headers, 'set-cookie')
	)
		return 0;
	const directive = control
		.split(',')
		.find((value) => /^\s*max-age\b/i.test(value));
	const maxAge = directive?.match(/^\s*max-age\s*=\s*"?(\d+)"?\s*$/i)?.[1];
	if (directive !== undefined && maxAge === undefined) return 0;
	const expires = Date.parse(getHeader(headers, 'expires') ?? '');
	const date = Date.parse(getHeader(headers, 'date') ?? '');
	const now = Date.now();
	const age = Math.max(
		Number(getHeader(headers, 'age') ?? 0) * 1000,
		Number.isFinite(date) ? Math.max(0, now - date) : 0,
	);
	const lifetime =
		maxAge !== undefined
			? Number(maxAge) * 1000 - age
			: Number.isFinite(expires)
				? expires - (Number.isFinite(date) ? date : now) - age
				: ttlMs - age;
	return now + Math.min(ttlMs, lifetime);
}
