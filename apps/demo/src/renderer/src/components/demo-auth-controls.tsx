import { AuthButton } from './ui/auth-button.js';
import { useAuthStore } from './ui/auth-context.js';
import type { OAuthLoginFn } from './ui/oauth-panel.js';

export function DemoAuthControls() {
	const auth = useAuthStore();

	const loginWithRefresh: OAuthLoginFn = async (providerId, callbacks) => {
		await auth.loginOAuth(providerId, callbacks);
		await auth.refresh();
	};

	const openExternal = async (url: string) => {
		window.open(url, '_blank');
	};

	return (
		<AuthButton
			oauthProviders={providers}
			apiKeyProviders={apiKeyProviders}
			onLogin={loginWithRefresh}
			onOpenUrl={openExternal}
		/>
	);
}
