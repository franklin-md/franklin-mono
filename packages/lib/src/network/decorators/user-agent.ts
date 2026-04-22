import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';
import { getHeader, setHeader } from '../headers.js';

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (compatible; Franklin/0.0; +https://franklin.local)';

/**
 * Injects a default `user-agent` when the caller didn't set one.
 */
export function withUserAgent(
	defaultUserAgent = DEFAULT_USER_AGENT,
): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			if (getHeader(request.headers, 'user-agent') !== undefined) {
				return next(request);
			}
			return next({
				...request,
				headers: setHeader(request.headers, 'user-agent', defaultUserAgent),
			});
		};
}
