import { assertAllowed, type NetworkPermissions } from '@franklin/lib';
import type { SandboxAskCallback } from '@anthropic-ai/sandbox-runtime';

export function createSandboxNetworkPolicy(
	permissions: NetworkPermissions,
): SandboxAskCallback {
	return async ({ host, port }) => {
		try {
			const hostname =
				host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
			// This URL represents the proxy's destination, not a request to send.
			// Reuse the web policy, including default ports and IPv6 normalization.
			assertAllowed(new URL(`http://${hostname}:${port}/`), permissions);
			return true;
		} catch {
			return false;
		}
	};
}
