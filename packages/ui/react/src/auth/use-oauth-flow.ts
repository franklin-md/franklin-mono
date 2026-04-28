import { useEffect, useState } from 'react';

import type { OAuthLoginCallbacks } from '@franklin/agent/browser';

import { useApp } from '../agent/franklin-context.js';

import { useAuthManager } from './use-auth-manager.js';

export type OAuthFlowState =
	| { phase: 'idle' }
	| { phase: 'starting' }
	| { phase: 'in-progress'; message: string }
	| { phase: 'waiting' }
	| { phase: 'success' }
	| { phase: 'error'; message: string };

export function useOAuthFlow(providerId: string) {
	const auth = useAuthManager();
	const app = useApp();

	const [flowState, setFlowState] = useState<OAuthFlowState>({ phase: 'idle' });

	// Release the loopback port if the user closes the modal mid-flow — fixed
	// callback ports mean a leaked listener blocks the next sign-in attempt.
	useEffect(() => {
		return () => {
			void auth.cancel(providerId);
		};
	}, [auth, providerId]);

	async function login() {
		setFlowState({ phase: 'starting' });

		const callbacks: OAuthLoginCallbacks = {
			onAuth: (info) => {
				void app.platform.os.openExternal(info.url);
				setFlowState({ phase: 'waiting' });
			},
			onProgress: (message) => {
				setFlowState((prev) =>
					prev.phase === 'waiting' ? prev : { phase: 'in-progress', message },
				);
			},
		};

		try {
			await auth.loginOAuth(providerId, callbacks);
			setFlowState({ phase: 'success' });
		} catch (err) {
			setFlowState({
				phase: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	function remove() {
		auth.removeOAuthEntry(providerId);
	}

	return { flowState, login, remove };
}
