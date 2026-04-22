import type { Fetch, NetworkPermissions, WebAPI } from '@franklin/lib';
import { withNormalize, withPolicy } from '@franklin/lib';

// AGENT-TODO: Should live in permissions folder and be called something like createPermissionedNetwork

/**
 * Composes the WebAPI that the environment exposes to extensions. The
 * environment layer adds two things on top of a platform transport:
 *
 *   withNormalize  — URL + method validation, default user-agent, lowercase headers
 *   withPolicy     — allow/deny/loopback/SSRF checks
 *
 * Timeout and redirect handling live in `withBounded`, which extensions
 * compose on top of `environment.web.fetch` when they need bounded calls.
 */
export function createWeb(
	permissions: NetworkPermissions,
	transport: Fetch,
): WebAPI {
	return { fetch: withNormalize(withPolicy(permissions)(transport)) };
}
