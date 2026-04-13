import { useApp } from '@franklin/react';
import type { AppAuth } from '@franklin/agent/browser';

/** Returns the nearest store from `<AuthProvider>`. Throws if not inside one. */
export function useAuthStore(): AppAuth {
	return useApp().auth;
}
