import { createContext, useContext, type ReactNode } from 'react';

import type { IAuthStore } from '../types.js';

const AuthStoreContext = createContext<IAuthStore | null>(null);

/**
 * Provides an auth store to all descendant auth components.
 *
 * Accepts any `IAuthStore` implementation — the Node.js `AuthStore` for
 * direct use, or `ElectronAuthStore` from `@franklin/electron/renderer` in
 * an Electron renderer process.
 */
export function AuthProvider({
	store,
	children,
}: {
	store: IAuthStore;
	children: ReactNode;
}) {
	return (
		<AuthStoreContext.Provider value={store}>
			{children}
		</AuthStoreContext.Provider>
	);
}

/** Returns the nearest store from `<AuthProvider>`. Throws if not inside one. */
export function useAuthStore(): IAuthStore {
	const store = useContext(AuthStoreContext);
	if (!store)
		throw new Error('useAuthStore must be used inside <AuthProvider>');
	return store;
}
