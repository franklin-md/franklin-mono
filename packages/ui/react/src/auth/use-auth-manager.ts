import type { AuthManager } from '@franklin/agent/browser';

import { useApp } from '../agent/franklin-context.js';

/** Returns the `AuthManager` from the nearest `FranklinProvider`. */
export function useAuthManager(): AuthManager {
	return useApp().auth;
}
