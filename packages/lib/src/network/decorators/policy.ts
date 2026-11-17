import type { Fetch, NetworkPermissions } from '../types.js';
import { validateNetworkPermissions } from '../validate.js';
import type { FetchDecorator } from './types.js';
import { networkAllowed } from '../allowed.js';

/**
 * Throws if the URL's host is not allowed by the given permissions. Pure
 * guard — does not mutate the request. Placed inside withRedirect so that
 * every hop re-invokes the check via the next() call.
 */
export function withPolicy(permissions: NetworkPermissions): FetchDecorator {
	validateNetworkPermissions(permissions);
	return (next: Fetch): Fetch =>
		async (request) => {
			const host = new URL(request.url).hostname;
			if (!networkAllowed(host, permissions)) {
				throw new Error(`Network access denied for host "${host}"`);
			}
			return next(request);
		};
}
