import { useApp } from '@franklin/react';
import type { AuthManager } from '@franklin/agent/browser';

/** Returns the `AuthManager` from the nearest `FranklinProvider`. */
export function useAuthManager(): AuthManager {
	return useApp().auth;
}
