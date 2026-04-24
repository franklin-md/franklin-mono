import { LOGIN_BUTTONS } from '../login-button/registry.js';
import { Button } from '../../primitives/button.js';
import { useAuthEntries } from '../use-entries.js';

import type { OAuthProviderMeta } from './types.js';
import { OAuthFlowView } from './flow-view.js';
import { useOAuthFlow } from './hook.js';

export function ProviderRow({ provider }: { provider: OAuthProviderMeta }) {
	const { isOAuthSignedIn } = useAuthEntries();
	const { flowState, login, remove, dismiss } = useOAuthFlow(provider.id);
	const isSignedIn = isOAuthSignedIn(provider.id);

	const LoginButton = LOGIN_BUTTONS[provider.id];
	if (!LoginButton) return null;

	const flowDone = flowState.phase === 'success' || flowState.phase === 'error';
	const flowRunning = !flowDone && flowState.phase !== 'idle';

	return (
		<div className="overflow-hidden rounded-md ring-1 ring-border">
			<div className="flex items-center gap-2 p-2.5">
				<LoginButton
					isLoading={flowRunning}
					isSignedIn={isSignedIn}
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

			{flowState.phase !== 'idle' && (
				<OAuthFlowView onDismiss={dismiss} state={flowState} />
			)}
		</div>
	);
}
