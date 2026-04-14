import { useState } from 'react';

import type { OAuthLoginCallbacks, AuthEntries } from '@franklin/agent/browser';

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
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			{providers.length === 0 && (
				<p style={{ color: '#888', margin: 0 }}>
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
						style={{
							borderRadius: 6,
							border: '1px solid #e0e0e0',
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								padding: '10px 14px',
								background: isActive ? '#f8f9fa' : '#fff',
							}}
						>
							<span style={{ flex: 1, fontWeight: 500, color: '#1a1a1a' }}>
								{provider.name}
							</span>

							{isSignedIn && !isActive && (
								<span style={{ fontSize: 13, color: '#2e7d32' }}>
									✓ Signed in
								</span>
							)}

							<button
								onClick={() => {
									void startLogin(provider);
								}}
								disabled={flowRunning}
								style={btnStyle(flowRunning)}
							>
								{isSignedIn ? 'Re-authenticate' : 'Sign in'}
							</button>

							{isSignedIn && (
								<button
									onClick={() => {
										void (async () => {
											store.removeOAuthEntry(provider.id);
											await onUpdate();
										})();
									}}
									disabled={flowRunning}
									style={btnStyle(flowRunning, true)}
								>
									Remove
								</button>
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
		<div
			style={{
				padding: '12px 14px',
				borderTop: '1px solid #e0e0e0',
				background: '#fafafa',
			}}
		>
			{state.phase === 'starting' && (
				<p style={statusText}>Starting login flow…</p>
			)}

			{state.phase === 'in-progress' && (
				<p style={statusText}>{state.message}</p>
			)}

			{state.phase === 'auth' && (
				<div>
					<p style={{ margin: '0 0 8px', fontSize: 13 }}>
						Open the following URL to complete authentication:
					</p>
					<a
						href={state.url}
						onClick={(event) => {
							if (!onOpenUrl) return;
							event.preventDefault();
							void onOpenUrl(state.url);
						}}
						style={{ fontSize: 12, wordBreak: 'break-all', color: '#1a73e8' }}
					>
						{state.url}
					</a>
					{state.instructions && (
						<p style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
							{state.instructions}
						</p>
					)}
				</div>
			)}

			{state.phase === 'success' && (
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<span style={{ color: '#2e7d32', fontSize: 13 }}>
						✓ Successfully signed in!
					</span>
					<button onClick={onDismiss} style={btnStyle(false, true)}>
						Dismiss
					</button>
				</div>
			)}

			{state.phase === 'error' && (
				<div>
					<p style={{ color: '#c62828', fontSize: 13, margin: '0 0 8px' }}>
						Error: {state.message}
					</p>
					<button onClick={onDismiss} style={btnStyle(false, true)}>
						Dismiss
					</button>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Micro style helpers
// ---------------------------------------------------------------------------

const statusText: React.CSSProperties = {
	margin: 0,
	fontSize: 13,
	color: '#555',
};

function btnStyle(disabled: boolean, secondary = false): React.CSSProperties {
	return {
		padding: '6px 12px',
		fontSize: 13,
		borderRadius: 4,
		border: secondary ? '1px solid #ccc' : 'none',
		background: disabled ? '#e0e0e0' : secondary ? '#fff' : '#1a73e8',
		color: disabled ? '#aaa' : secondary ? '#444' : '#fff',
		cursor: disabled ? 'not-allowed' : 'pointer',
		whiteSpace: 'nowrap',
	};
}
