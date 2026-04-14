import { OAuthFlow, type OAuthLoginCallbacks } from '@franklin/agent/browser';
import {
	getOAuthProvider,
	type OAuthLoginCallbacks as ProviderOAuthLoginCallbacks,
} from '@mariozechner/pi-ai/oauth';

export async function createOAuthFlow(providerId: string): Promise<OAuthFlow> {
	const provider = getOAuthProvider(providerId);
	if (!provider) {
		throw new Error(`OAuth provider "${providerId}" not found`);
	}

	return new OAuthFlow((callbacks) =>
		provider.login(toProviderOAuthLoginCallbacks(callbacks)),
	);
}

function toProviderOAuthLoginCallbacks(
	callbacks: OAuthLoginCallbacks,
): ProviderOAuthLoginCallbacks {
	return {
		...callbacks,
		onPrompt: async () => {
			throw unsupportedManualOAuthFallbackError();
		},
		onManualCodeInput: async () => {
			throw unsupportedManualOAuthFallbackError();
		},
	};
}

function unsupportedManualOAuthFallbackError(): Error {
	return new Error(
		'OAuth manual code entry is not supported in Franklin desktop flows',
	);
}
