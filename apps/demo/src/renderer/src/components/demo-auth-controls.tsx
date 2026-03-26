import { useEffect, useState } from 'react';

import { ElectronAuthManager } from '@franklin/electron/renderer';
import { AuthButton } from './ui/auth-button.js';
import { AuthProvider } from './ui/auth-context.js';
import type { OAuthLoginFn, OAuthProviderMeta } from './ui/oauth-panel.js';
import { initializeSharedAuthManager } from '@/lib/auth-store.js';

export function DemoAuthControls() {
	const authBridge = window.__franklinBridge.auth ?? null;
	const [manager, setManager] = useState<ElectronAuthManager | null>(null);
	const [providers, setProviders] = useState<OAuthProviderMeta[]>([]);
	const [apiKeyProviders, setApiKeyProviders] = useState<OAuthProviderMeta[]>(
		[],
	);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!authBridge) return;

		const effectBridge = authBridge;
		let cancelled = false;

		async function loadAuthState() {
			const effectManager = await initializeSharedAuthManager();
			if (!effectManager || cancelled) return;

			const nextProviders = await effectBridge.getProviders();
			const nextApiKeyProviders = await effectBridge.getCanonicalProviders();
			if (cancelled) return;
			setManager(effectManager);
			setProviders(nextProviders);
			setApiKeyProviders(
				nextApiKeyProviders.map((providerId) => ({
					id: providerId,
					name: providerId,
				})),
			);
			setIsReady(true);
		}

		void loadAuthState();

		return () => {
			cancelled = true;
		};
	}, [authBridge]);

	if (!authBridge || !manager || !isReady) {
		return null;
	}

	const readyBridge = authBridge;
	const readyManager = manager;

	const loginWithRefresh: OAuthLoginFn = async (providerId, callbacks) => {
		await readyManager.loginOAuth(providerId, callbacks);
		await readyManager.refresh();
	};

	const openExternal = async (url: string) => {
		await readyBridge.openExternal(url);
	};

	return (
		<AuthProvider store={readyManager}>
			<AuthButton
				oauthProviders={providers}
				apiKeyProviders={apiKeyProviders}
				onLogin={loginWithRefresh}
				onOpenUrl={openExternal}
			/>
		</AuthProvider>
	);
}
