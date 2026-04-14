import { useEffect, useState } from 'react';
import { useAuthManager } from './ui/auth-context.js';
import { AuthButton } from './ui/auth-button.js';
import type { OAuthProviderMeta } from './ui/oauth-panel.js';

export function DemoAuthControls() {
	const auth = useAuthManager();
	const [oauthProviders, setOauthProviders] = useState<OAuthProviderMeta[]>([]);
	const [apiKeyProviders, setApiKeyProviders] = useState<OAuthProviderMeta[]>(
		[],
	);

	// TODO: Refactor. This is a hook with an initial and promise and should be a state that is initial until promise resolves once, then
	useEffect(() => {
		let cancelled = false;

		async function loadProviders() {
			const [oauth, apiKey] = await Promise.all([
				auth.getOAuthProviders(),
				auth.getApiKeyProviders(),
			]);
			if (!cancelled) {
				setOauthProviders(oauth);
				setApiKeyProviders(
					apiKey.map((providerId) => ({ id: providerId, name: providerId })),
				);
			}
		}

		void loadProviders();

		return () => {
			cancelled = true;
		};
	}, [auth]);

	return (
		<AuthButton
			oauthProviders={oauthProviders}
			apiKeyProviders={apiKeyProviders}
		/>
	);
}
