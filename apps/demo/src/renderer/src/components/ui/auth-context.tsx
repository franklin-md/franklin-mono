import { useApp } from '@franklin/react';
import type { Platform } from '@franklin/agent/browser';

/** Returns the nearest store from `<AuthProvider>`. Throws if not inside one. */
export function useAuthStore(): Platform['auth'] {
	return useApp().auth;
}
