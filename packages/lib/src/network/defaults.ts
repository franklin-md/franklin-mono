import type { Fetch, FetchDecorator } from './types.js';

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (compatible; Franklin/0.0; +https://franklin.local)';

/**
 * Applies per-request defaults: a default `user-agent` when the caller didn't
 * set one, and lowercases all header keys so downstream decorators (policy,
 * redirect) can rely on canonical casing.
 *
 * URL / protocol / method validation intentionally does NOT live here —
 * `normalizeUrl` at the extension boundary, `new URL()` in `withPolicy`, and
 * `withRedirect`'s hop validation already cover it.
 */
export const withDefaults: FetchDecorator = (next: Fetch): Fetch => {
	return async (request) => {
		const headers: Record<string, string> = {
			'user-agent': DEFAULT_USER_AGENT,
		};
		if (request.headers) {
			for (const [key, value] of Object.entries(request.headers)) {
				headers[key.toLowerCase()] = value;
			}
		}

		return next({ ...request, headers });
	};
};
