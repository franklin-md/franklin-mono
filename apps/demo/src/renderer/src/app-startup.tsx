import { useEffect, useRef, useState, type ReactNode } from 'react';

import { FranklinApp, type FranklinExtension } from '@franklin/agent';
import type { Platform } from '@franklin/agent';
import { joinAbsolute } from '@franklin/lib';

export type AppStartupProps = {
	extensions: readonly FranklinExtension[];
	platform: Platform;
	fallback?: ReactNode;
	children: (harness: FranklinApp) => ReactNode;
};

export function AppStartup({
	extensions,
	platform,
	fallback,
	children,
}: AppStartupProps) {
	const [harness, setHarness] = useState<FranklinApp | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const cancelledRef = useRef(false);

	useEffect(() => {
		cancelledRef.current = false;

		void (async () => {
			try {
				const home = await platform.os.osInfo.getHomeDir();
				const appDir = joinAbsolute(home, '.franklin');

				const created = new FranklinApp({
					extensions,
					platform,
					appDir,
				});
				// TODO: Should we make this optional?
				await created.start();
				if (cancelledRef.current) {
					// TODO: We probably want app.dispose().
				} else {
					setHarness(created);
				}
			} catch (err) {
				if (!cancelledRef.current) {
					setError(err instanceof Error ? err : new Error(String(err)));
				}
			}
		})();

		return () => {
			cancelledRef.current = true;
			// TODO: We probably want app.dispose().
		};
	}, [extensions, platform]);

	if (error) {
		throw error;
	}

	if (!harness) {
		return <>{fallback}</>;
	}

	return <>{children(harness)}</>;
}
