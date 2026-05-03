import type { Fetch, NetworkPermissions, WebAPI } from '@franklin/lib';
import { decorate, withPolicy, withUserAgent } from '@franklin/lib';

// TODO(FRA-239): Move this into a permissions folder and rename it to createPermissionedNetwork.

/**
 * Composes the WebAPI that the environment exposes to extensions.
 *
 *   withPolicy             — innermost: allow/deny/loopback/SSRF checks
 *   withUserAgent          — outermost: default user-agent when the caller
 *                            didn't set one
 *
 * Timeout and redirect handling live in `withTimeout` and `withRedirect`,
 * which extensions compose on top of `environment.web.fetch` when they need
 * bounded calls. Header casing remains transport-defined, so downstream code
 * should use `getHeader(...)` for case-insensitive reads.
 */
export function createWeb(
	permissions: NetworkPermissions,
	transport: Fetch,
): WebAPI {
	return {
		fetch: decorate(transport)
			.with(withPolicy(permissions))
			.with(withUserAgent())
			.build(),
	};
}
