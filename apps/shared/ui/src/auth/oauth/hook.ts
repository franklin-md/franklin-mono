import { useState } from 'react';

import type { OAuthLoginCallbacks } from '@franklin/agent/browser';
import { useApp } from '@franklin/react';

import { useAuthManager } from '../context.js';

import type { FlowState } from './types.js';

export function useOAuthFlow(
	providerId: string,
	onUpdate: () => Promise<void>,
) {
	const auth = useAuthManager();
	const app = useApp();

	const [flowState, setFlowState] = useState<FlowState>({ phase: 'idle' });

	async function login() {
		setFlowState({ phase: 'starting' });

		const callbacks: OAuthLoginCallbacks = {
			onAuth: (info) => {
				void app.platform.openExternal(info.url);
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
			await onUpdate();
		} catch (err) {
			setFlowState({
				phase: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	function remove() {
		auth.removeOAuthEntry(providerId);
		void onUpdate();
	}

	function dismiss() {
		setFlowState({ phase: 'idle' });
	}

	return { flowState, login, remove, dismiss };
}
