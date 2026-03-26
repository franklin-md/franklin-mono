import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';

import { createApp } from '@franklin/agent/browser';
import type {
	FranklinApp,
	FranklinExtension,
	Platform,
} from '@franklin/agent/browser';
import type { IAuthManager } from 'packages/agent/src/auth/types.js';

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
				created = await createApp(extensions, platform, auth);
				if (cancelledRef.current) {
					await Promise.allSettled(
						created.agents.list().map((s) => s.agent.dispose()),
					);
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
				void Promise.allSettled(
					created.agents.list().map((s) => s.agent.dispose()),
				);
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
