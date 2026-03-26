import { useApp } from '@franklin/react';
import type { IAuthManager } from '@franklin/agent';

/** Returns the nearest store from `<AuthProvider>`. Throws if not inside one. */
export function useAuthStore(): IAuthManager {
	return useApp().auth;
}
