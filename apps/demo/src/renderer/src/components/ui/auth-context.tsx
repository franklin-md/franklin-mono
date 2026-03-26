import { useApp } from '@franklin/react';
import type { AuthManager } from '@franklin/agent';

/** Returns the nearest store from `<AuthProvider>`. Throws if not inside one. */
export function useAuthStore(): AuthManager {
	return useApp().auth;
}
