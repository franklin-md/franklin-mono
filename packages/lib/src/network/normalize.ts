import type { Fetch, FetchDecorator, WebFetchMethod } from './types.js';

// AGENT-TODO: Is this file even needed? URL parsing, protocols and agents are kind of provided lower down?
const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (compatible; Franklin/0.0; +https://franklin.local)';

const ALLOWED_METHODS = new Set<WebFetchMethod>([
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
]);

/**
 * Input validation + header canonicalisation. Validates URL + method, applies
 * default user-agent, lowercases header keys so downstream decorators
 * (policy, bounded) can rely on canonical casing.
 *
 * Re-fires safely if a redirect loop re-enters this layer — idempotent.
 */
export const withNormalize: FetchDecorator = (next: Fetch): Fetch => {
	return async (request) => {
		if (request.url.trim() === '') {
			throw new Error('URL is required');
		}

		let url: URL;
		try {
			url = new URL(request.url);
		} catch {
			throw new Error(`Invalid URL: ${request.url}`);
		}

		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new Error('Only HTTP and HTTPS URLs are supported');
		}

		if (!ALLOWED_METHODS.has(request.method)) {
			throw new Error(`Unsupported HTTP method: "${request.method}"`);
		}

		const headers: Record<string, string> = {
			'user-agent': DEFAULT_USER_AGENT,
		};
		if (request.headers) {
			for (const [key, value] of Object.entries(request.headers)) {
				headers[key.toLowerCase()] = value;
			}
		}

		return next({ ...request, url: url.toString(), headers });
	};
};
