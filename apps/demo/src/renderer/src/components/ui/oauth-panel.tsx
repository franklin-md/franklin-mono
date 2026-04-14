import { useState } from 'react';

import type { OAuthLoginCallbacks, AuthEntries } from '@franklin/agent/browser';
import { Button } from '@franklin/ui';
import { useApp, useAsync } from '@franklin/react';
import { Loader2 } from 'lucide-react';

import { useAuthManager } from './auth-context.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Minimal provider descriptor — id + display name. */
export type OAuthProviderMeta = { id: string; name: string };

// ---------------------------------------------------------------------------
// Flow state machine
// ---------------------------------------------------------------------------

type FlowState =
	| { phase: 'idle' }
	| { phase: 'starting' }
	| { phase: 'in-progress'; message: string }
	| { phase: 'waiting' }
	| { phase: 'success' }
	| { phase: 'error'; message: string };

// ---------------------------------------------------------------------------
// OAuthPanel
// ---------------------------------------------------------------------------

/**
 * Lists OAuth providers and allows the user to sign in.
 *
 * Clicking "Sign in" starts the OAuth flow and automatically opens the
 * browser via `platform.openExternal`. The button shows a loading spinner
 * while waiting for the user to complete authentication in the browser.
 */
export function OAuthPanel({
	savedEntries,
	onUpdate,
}: {
	savedEntries: AuthEntries;
	onUpdate: () => Promise<void>;
}) {
	const auth = useAuthManager();
	const app = useApp();
	const providers = useAsync(() => auth.getOAuthProviders(), [], [auth]);

	const [activeProvider, setActiveProvider] = useState<string | null>(null);
	const [flowState, setFlowState] = useState<FlowState>({ phase: 'idle' });

	async function startLogin(provider: OAuthProviderMeta) {
		setActiveProvider(provider.id);
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
			await auth.loginOAuth(provider.id, callbacks);
			setFlowState({ phase: 'success' });
			await onUpdate();
		} catch (err) {
			setFlowState({
				phase: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	function dismissFlow() {
		setActiveProvider(null);
		setFlowState({ phase: 'idle' });
	}

	return (
		<div className="flex flex-col gap-3">
			{providers.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No OAuth providers registered.
				</p>
			)}
			{providers.map((provider) => {
				const isSignedIn = Boolean(savedEntries[provider.id]?.oauth);
				const isActive = activeProvider === provider.id;
				const flowDone =
					isActive &&
					(flowState.phase === 'success' || flowState.phase === 'error');
				const flowRunning = isActive && !flowDone && flowState.phase !== 'idle';

				return (
					<div
						key={provider.id}
						className="overflow-hidden rounded-md ring-1 ring-border"
					>
						<div className="flex items-center gap-2.5 px-3.5 py-2.5">
							<span className="flex-1 text-sm font-medium text-foreground">
								{provider.name}
							</span>

							{isSignedIn && !isActive && (
								<span className="text-xs text-green-700">
									&#10003; Signed in
								</span>
							)}

							<Button
								size="sm"
								onClick={() => {
									void startLogin(provider);
								}}
								disabled={flowRunning}
							>
								{flowRunning && (
									<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
								)}
								{isSignedIn ? 'Re-authenticate' : 'Sign in'}
							</Button>

							{isSignedIn && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										void (async () => {
											auth.removeOAuthEntry(provider.id);
											await onUpdate();
										})();
									}}
									disabled={flowRunning}
								>
									Remove
								</Button>
							)}
						</div>

						{isActive && flowState.phase !== 'idle' && (
							<OAuthFlowView state={flowState} onDismiss={dismissFlow} />
						)}
					</div>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// OAuthFlowView — inline step display
// ---------------------------------------------------------------------------

function OAuthFlowView({
	state,
	onDismiss,
}: {
	state: FlowState;
	onDismiss: () => void;
}) {
	return (
		<div className="border-t border-border bg-muted/50 px-3.5 py-3">
			{state.phase === 'starting' && (
				<p className="text-sm text-muted-foreground">Starting login flow…</p>
			)}

			{state.phase === 'in-progress' && (
				<p className="text-sm text-muted-foreground">{state.message}</p>
			)}

			{state.phase === 'waiting' && (
				<div className="flex items-center gap-2">
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						Waiting for authentication… Browser opened.
					</p>
				</div>
			)}

			{state.phase === 'success' && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-green-700">
						&#10003; Successfully signed in!
					</span>
					<Button variant="outline" size="sm" onClick={onDismiss}>
						Dismiss
					</Button>
				</div>
			)}

			{state.phase === 'error' && (
				<div>
					<p className="mb-2 text-sm text-destructive">
						Error: {state.message}
					</p>
					<Button variant="outline" size="sm" onClick={onDismiss}>
						Dismiss
					</Button>
				</div>
			)}
		</div>
	);
}
