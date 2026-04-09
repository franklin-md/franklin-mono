import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';

import { FranklinApp, type FranklinExtension } from '@franklin/agent/browser';
import type { IAuthManager, Platform } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** @internal — exported for test wrappers only. */
export const AppContext = createContext<FranklinApp | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Top-level provider for a Franklin application.
 *
 * Accepts `extensions` and `platform`, calls `createApp` internally,
 * and handles the async loading / cleanup lifecycle. Children are only
 * rendered once the app is ready.
 */
export function FranklinProvider({
	extensions,
	platform,
	auth,
	fallback,
	children,
}: {
	extensions: FranklinExtension[];
	platform: Platform;
	auth: IAuthManager;
	fallback?: ReactNode;
	children: ReactNode;
}) {
	const [app, setApp] = useState<FranklinApp | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const cancelledRef = useRef(false);

	useEffect(() => {
		cancelledRef.current = false;
		let created: FranklinApp | undefined;

		void (async () => {
			try {
				// TODO: Make this user specifiable?
				created = new FranklinApp({
					extensions,
					platform,
					auth,
					persistDir: '.',
				});
				// TODO: Should we make this optional?
				await created.start();
				if (cancelledRef.current) {
					// TODO: We probably want app.dispose().
				} else {
					setApp(created);
				}
			} catch (err) {
				if (!cancelledRef.current) {
					setError(err instanceof Error ? err : new Error(String(err)));
				}
			}
		})();

		return () => {
			cancelledRef.current = true;
			if (created) {
				// TODO: We probably want app.dispose().
			}
		};
	}, [extensions, platform]);

	if (error) {
		throw error;
	}

	if (!app) {
		return <>{fallback}</>;
	}

	return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}

// ---------------------------------------------------------------------------
// useApp — returns the FranklinApp instance
// ---------------------------------------------------------------------------

export function useApp(): FranklinApp {
	const app = useContext(AppContext);
	if (!app) {
		throw new Error('useApp must be used inside a <FranklinProvider>');
	}
	return app;
}
