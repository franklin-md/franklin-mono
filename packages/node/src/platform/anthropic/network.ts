import {
	assertAllowed,
	validateNetworkPermissions,
	type NetworkPermissions,
} from '@franklin/lib';
import type { SandboxAskCallback } from '@anthropic-ai/sandbox-runtime';

export function createSandboxNetworkPolicy(
	getPermissions: () => NetworkPermissions,
): SandboxAskCallback {
	validateNetworkPermissions(getPermissions());
	return async ({ host, port }) => {
		try {
			if (
				port === undefined ||
				!Number.isInteger(port) ||
				port < 1 ||
				port > 65535
			)
				return false;
			const hostname =
				host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
			const url = new URL(`http://${hostname}:${port}/`);
			if (
				url.username ||
				url.password ||
				url.pathname !== '/' ||
				url.search ||
				url.hash
			)
				return false;
			// SRT 0.0.46 retains its first callback while initialized. Read the
			// current validated policy so reconfiguration can immediately revoke access.
			assertAllowed(url, getPermissions());
			return true;
		} catch {
			return false;
		}
	};
}
