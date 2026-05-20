import type { AuthManager } from '@franklin/agent';

import { useHarness } from '../agent/harness-context.js';

/** Returns the `AuthManager` from the nearest `HarnessProvider`. */
export function useAuthManager(): AuthManager {
	return useHarness().auth;
}
