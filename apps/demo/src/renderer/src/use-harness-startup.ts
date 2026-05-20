import { useEffect, useRef, useState } from 'react';

import {
	AuthManager,
	createAuthStore,
	FranklinApp,
	type FranklinExtension,
} from '@franklin/agent';
import type { Platform } from '@franklin/agent';
import { joinAbsolute } from '@franklin/lib';

export type UseHarnessStartupOptions = {
	extensions: readonly FranklinExtension[];
	platform: Platform;
};

export type HarnessStartupState =
	| { status: 'loading' }
	| { status: 'ready'; harness: FranklinApp }
	| { status: 'error'; error: Error };

export function useHarnessStartup({
	extensions,
	platform,
}: UseHarnessStartupOptions): HarnessStartupState {
	const [state, setState] = useState<HarnessStartupState>({
		status: 'loading',
	});
	const runIdRef = useRef(0);

	useEffect(() => {
		const runId = runIdRef.current + 1;
		runIdRef.current = runId;
		setState({ status: 'loading' });

		void (async () => {
			try {
				const harness = await createStartedHarness({ extensions, platform });
				if (runIdRef.current !== runId) {
					// TODO: We probably want app.dispose().
				} else {
					setState({ status: 'ready', harness });
				}
			} catch (err) {
				if (runIdRef.current === runId) {
					setState({
						status: 'error',
						error: err instanceof Error ? err : new Error(String(err)),
					});
				}
			}
		})();

		return () => {
			runIdRef.current += 1;
			// TODO: We probably want app.dispose().
		};
	}, [extensions, platform]);

	return state;
}

async function createStartedHarness({
	extensions,
	platform,
}: UseHarnessStartupOptions): Promise<FranklinApp> {
	const home = await platform.os.osInfo.getHomeDir();
	const appDir = joinAbsolute(home, '.franklin');
	const auth = new AuthManager(
		platform,
		createAuthStore(platform.os.filesystem, appDir),
	);
	const harness = new FranklinApp({
		extensions,
		platform,
		appDir,
		auth,
	});
	// TODO: Should we make this optional?
	await harness.start();
	return harness;
}
