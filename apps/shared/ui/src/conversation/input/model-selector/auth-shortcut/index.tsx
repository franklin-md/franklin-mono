import { useAuthEntries } from '@franklin/react';

import { LOGIN_BUTTONS } from '../../../../auth/login-button/registry.js';

import type { AccessType } from '../../models/catalog.js';
import { ApiKeyAuthAction } from './api-key-login.js';
import { OAuthLoginAuthAction } from './oauth-login.js';
import { SignedInAuthStatus } from './signed-in-auth-status.js';

type Props = {
	access: AccessType;
	displayName: string;
	provider: string;
};

export function ProviderAuthAction({ access, displayName, provider }: Props) {
	const { entries } = useAuthEntries();
	const entry = entries[provider];

	if (entry?.oauth || entry?.apiKey) {
		return <SignedInAuthStatus displayName={displayName} />;
	}

	if (provider in LOGIN_BUTTONS) {
		return (
			<OAuthLoginAuthAction displayName={displayName} provider={provider} />
		);
	}

	if (access === 'api') {
		return <ApiKeyAuthAction displayName={displayName} />;
	}

	return null;
}
