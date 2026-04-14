import { useApp } from '@franklin/react';
import type { AuthManager } from '@franklin/agent/browser';

/** Returns the nearest store from `<AuthProvider>`. Throws if not inside one. */
export function useAuthManager(): AuthManager {
	return useApp().auth;
}
