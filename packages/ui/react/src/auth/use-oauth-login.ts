import { useCallback, useEffect, useRef, useState } from 'react';

import type { OAuthLoginCallbacks } from '@franklin/agent/browser';

import { useApp } from '../agent/franklin-context.js';

import { useAuthManager } from './use-auth-manager.js';

export type OAuthLoginState =
	| { phase: 'idle' }
	| { phase: 'starting' }
	| { phase: 'in-progress'; message: string }
	| { phase: 'waiting' }
	| { phase: 'success' }
	| { phase: 'error'; message: string };

function isPending(state: OAuthLoginState): boolean {
	return (
		state.phase === 'starting' ||
		state.phase === 'in-progress' ||
		state.phase === 'waiting'
	);
}

export function useOAuthLogin(providerId: string) {
	const auth = useAuthManager();
	const app = useApp();
	const mountedRef = useRef(false);
	const activeProviderRef = useRef(providerId);
	const hasActiveLoginRef = useRef(false);
	const [state, setState] = useState<OAuthLoginState>({ phase: 'idle' });

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (hasActiveLoginRef.current) {
				void auth.cancel(activeProviderRef.current);
			}
		};
	}, [auth]);

	const handleLogin = useCallback(async () => {
		activeProviderRef.current = providerId;
		hasActiveLoginRef.current = true;
		setState({ phase: 'starting' });

		const callbacks: OAuthLoginCallbacks = {
			onAuth: (info) => {
				void app.platform.os.openExternal(info.url);
				if (mountedRef.current) {
					setState({ phase: 'waiting' });
				}
			},
			onProgress: (message) => {
				if (!mountedRef.current) return;
				setState((prev) =>
					prev.phase === 'waiting' ? prev : { phase: 'in-progress', message },
				);
			},
		};

		try {
			await auth.loginOAuth(providerId, callbacks);
			if (mountedRef.current) {
				setState({ phase: 'success' });
			}
		} catch (err) {
			if (mountedRef.current) {
				setState({
					phase: 'error',
					message: err instanceof Error ? err.message : String(err),
				});
			}
		} finally {
			hasActiveLoginRef.current = false;
		}
	}, [app.platform.os, auth, providerId]);

	const reset = useCallback(() => {
		setState({ phase: 'idle' });
	}, []);

	const remove = useCallback(() => {
		auth.removeOAuthEntry(providerId);
	}, [auth, providerId]);

	return {
		state,
		pending: isPending(state),
		handleLogin,
		remove,
		reset,
	};
}
