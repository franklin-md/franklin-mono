import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * Manual redirect loop. On 3xx, re-invokes `next` with a rewritten URL so
 * decorators below (policy, defaults) fire per hop via that re-invocation.
 */
export function withRedirect(maxRedirects: number): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			let currentUrl = request.url;

			for (let i = 0; i <= maxRedirects; i++) {
				const response = await next({ ...request, url: currentUrl });

				if (!REDIRECT_STATUS_CODES.has(response.status)) {
					return response;
				}

				const location = response.headers['location'];
				if (!location) {
					throw new Error('Redirect response missing Location header');
				}

				const resolved = new URL(location, currentUrl);
				if (!['http:', 'https:'].includes(resolved.protocol)) {
					throw new Error('Only HTTP and HTTPS URLs are supported');
				}
				currentUrl = resolved.toString();
			}

			throw new Error(
				`Redirect limit exceeded (${maxRedirects}) for "${request.url}"`,
			);
		};
}
