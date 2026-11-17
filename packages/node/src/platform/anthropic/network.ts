import { networkAllowed, type NetworkPermissions } from '@franklin/lib';
import type { SandboxAskCallback } from '@anthropic-ai/sandbox-runtime';

export function createSandboxNetworkPolicy(
	getPermissions: () => NetworkPermissions,
): SandboxAskCallback {
	// SRT retains its first callback while initialized. The manager owner must
	// drain active commands before switching policy; this getter is not isolation.
	return async ({ host }) => networkAllowed(host, getPermissions());
}
