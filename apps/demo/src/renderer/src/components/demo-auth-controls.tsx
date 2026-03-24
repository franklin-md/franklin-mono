import { useEffect, useState } from 'react';

import {
	AuthButton,
	AuthProvider,
	type OAuthLoginFn,
	type OAuthProviderMeta,
} from '@franklin/auth/react';
import { ElectronAuthStore, createIpcLoginOAuth } from '@franklin/electron/renderer';

export function DemoAuthControls() {
	const authBridge = window.__franklinBridge.auth ?? null;
	const [store] = useState(() =>
		authBridge ? new ElectronAuthStore(authBridge) : null,
	);
	const [providers, setProviders] = useState<OAuthProviderMeta[]>([]);
	const [apiKeyProviders, setApiKeyProviders] = useState<OAuthProviderMeta[]>([]);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!authBridge || !store) return;

		const effectBridge = authBridge;
		const effectStore = store;
		let cancelled = false;

		async function loadAuthState() {
			await effectStore.initialize();
			const nextProviders = await effectBridge.getProviders();
			const nextApiKeyProviders = await effectBridge.getCanonicalProviders();
			if (cancelled) return;
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
	}, [authBridge, store]);

	if (!authBridge || !store || !isReady) {
		return null;
	}

	const readyBridge = authBridge;
	const readyStore = store;

	const loginWithRefresh: OAuthLoginFn = async (providerId, callbacks) => {
		const loginOAuth = createIpcLoginOAuth(readyBridge);
		await loginOAuth(providerId, callbacks);
		await readyStore.refresh();
	};

	const openExternal = async (url: string) => {
		await readyBridge.openExternal(url);
	};

	return (
		<AuthProvider store={readyStore}>
			<AuthButton
				oauthProviders={providers}
				apiKeyProviders={apiKeyProviders}
				onLogin={loginWithRefresh}
				onOpenUrl={openExternal}
			/>
		</AuthProvider>
	);
}
