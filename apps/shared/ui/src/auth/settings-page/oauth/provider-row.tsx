import { useAuthEntries, useOAuthLogin } from '@franklin/react';

import { Button } from '../../../primitives/button.js';
import { isOAuthFlowRunning } from '../../login-button/flow.js';
import { LOGIN_BUTTONS } from '../../login-button/registry.js';

import { OAuthFlowView } from './flow-view.js';
import type { OAuthProviderMeta } from './types.js';

export function ProviderRow({ provider }: { provider: OAuthProviderMeta }) {
	const { isOAuthSignedIn } = useAuthEntries();
	const { state, handleLogin, remove, reset } = useOAuthLogin(provider.id);
	const isSignedIn = isOAuthSignedIn(provider.id);

	const LoginButton = LOGIN_BUTTONS[provider.id];
	if (!LoginButton) return null;

	const flowRunning = isOAuthFlowRunning(state);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<LoginButton
					isLoading={flowRunning}
					providerName={provider.name}
					onClick={() => {
						void handleLogin();
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

			<OAuthFlowView state={state} onDismiss={reset} />
		</div>
	);
}
