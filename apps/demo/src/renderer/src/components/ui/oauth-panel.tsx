import { useState } from 'react';

import type { OAuthLoginCallbacks, AuthEntries } from '@franklin/agent/browser';
import { Button } from '@franklin/ui';

import { useAuthStore } from './auth-context.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Minimal provider descriptor — id + display name. */
export type OAuthProviderMeta = { id: string; name: string };

/**
 * Initiates the OAuth login flow for a provider.
 *
 * Implementations call the callbacks as the flow progresses and resolve
 * when authentication completes, or reject on failure.
 */
export type OAuthLoginFn = (
	providerId: string,
	callbacks: OAuthLoginCallbacks,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Flow state machine
// ---------------------------------------------------------------------------

type FlowState =
	| { phase: 'idle' }
	| { phase: 'starting' }
	| { phase: 'in-progress'; message: string }
	| { phase: 'auth'; url: string; instructions?: string }
	| { phase: 'success' }
	| { phase: 'error'; message: string };

// ---------------------------------------------------------------------------
// OAuthPanel
// ---------------------------------------------------------------------------

/**
 * Lists OAuth providers and allows the user to sign in.
 *
 * `providers` and `onLogin` are injected so this component has no Node.js
 * dependencies — it works in any renderer environment (Node, Electron, etc.).
 *
 * `savedEntries` is owned by the parent — the panel never reads from disk.
 * `onUpdate` is called after any mutation so the parent can reload and re-pass entries.
 */
export function OAuthPanel({
	savedEntries,
	onUpdate,
	providers,
	onLogin,
	onOpenUrl,
}: {
	savedEntries: AuthEntries;
	onUpdate: () => Promise<void>;
	providers: OAuthProviderMeta[];
	onLogin: OAuthLoginFn;
	onOpenUrl?: (url: string) => void | Promise<void>;
}) {
	const store = useAuthStore();

	const [activeProvider, setActiveProvider] = useState<string | null>(null);
	const [flowState, setFlowState] = useState<FlowState>({ phase: 'idle' });

	async function startLogin(provider: OAuthProviderMeta) {
		setActiveProvider(provider.id);
		setFlowState({ phase: 'starting' });

		const callbacks: OAuthLoginCallbacks = {
			onAuth: (info) => {
				setFlowState({
					phase: 'auth',
					url: info.url,
					instructions: info.instructions,
				});
			},
			onProgress: (message) => {
				setFlowState((prev) =>
					prev.phase === 'auth' ? prev : { phase: 'in-progress', message },
				);
			},
		};

		try {
			await onLogin(provider.id, callbacks);
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
								{isSignedIn ? 'Re-authenticate' : 'Sign in'}
							</Button>

							{isSignedIn && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										void (async () => {
											store.removeOAuthEntry(provider.id);
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
							<OAuthFlowView
								state={flowState}
								onDismiss={dismissFlow}
								onOpenUrl={onOpenUrl}
							/>
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
	onOpenUrl,
}: {
	state: FlowState;
	onDismiss: () => void;
	onOpenUrl?: (url: string) => void | Promise<void>;
}) {
	return (
		<div className="border-t border-border bg-muted/50 px-3.5 py-3">
			{state.phase === 'starting' && (
				<p className="text-sm text-muted-foreground">Starting login flow…</p>
			)}

			{state.phase === 'in-progress' && (
				<p className="text-sm text-muted-foreground">{state.message}</p>
			)}

			{state.phase === 'auth' && (
				<div>
					<p className="mb-2 text-sm">
						Open the following URL to complete authentication:
					</p>
					<a
						href={state.url}
						onClick={(event) => {
							if (!onOpenUrl) return;
							event.preventDefault();
							void onOpenUrl(state.url);
						}}
						className="break-all text-xs text-primary underline"
					>
						{state.url}
					</a>
					{state.instructions && (
						<p className="mt-2 text-sm text-muted-foreground">
							{state.instructions}
						</p>
					)}
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
