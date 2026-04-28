import { useAuthEntries, useOAuthFlow } from '@franklin/react';

import { Button } from '../../primitives/button.js';
import { LOGIN_BUTTONS } from '../login-button/registry.js';

import type { OAuthProviderMeta } from './types.js';

export function ProviderRow({ provider }: { provider: OAuthProviderMeta }) {
	const { isOAuthSignedIn } = useAuthEntries();
	const { flowState, login, remove } = useOAuthFlow(provider.id);
	const isSignedIn = isOAuthSignedIn(provider.id);

	const LoginButton = LOGIN_BUTTONS[provider.id];
	if (!LoginButton) return null;

	const flowRunning =
		flowState.phase !== 'idle' &&
		flowState.phase !== 'success' &&
		flowState.phase !== 'error';

	return (
		<div className="flex items-center gap-2">
			<LoginButton
				isLoading={flowRunning}
				providerName={provider.name}
				onClick={() => {
					void login();
				}}
			/>

			{isSignedIn && (
				<Button
					disabled={flowRunning}
					onClick={remove}
					size="sm"
					variant="outline"
				>
					Remove
				</Button>
			)}
		</div>
	);
}
