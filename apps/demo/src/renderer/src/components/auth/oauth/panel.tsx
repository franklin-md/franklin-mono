import { useState } from 'react';

import type { OAuthLoginCallbacks, AuthEntries } from '@franklin/agent/browser';
import { useApp, useAsync } from '@franklin/react';

import { useAuthManager } from '../context.js';

import type { FlowState, OAuthProviderMeta } from './types.js';
import { ProviderRow } from './provider-row.js';

// Only surface these providers in the OAuth UI.
const ALLOWED_PROVIDERS = new Set(['anthropic', 'openai-codex']);

/**
 * Lists OAuth providers (filtered to Anthropic + OpenAI Codex) and allows
 * the user to sign in. Clicking "Sign in" starts the OAuth flow and
 * automatically opens the browser.
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

	const providers = useAsync(
		async () => {
			const all = await auth.getOAuthProviders();
			return all.filter((p) => ALLOWED_PROVIDERS.has(p.id));
		},
		[],
		[auth],
	);

	const [activeProvider, setActiveProvider] = useState<string | null>(null);
	const [flowState, setFlowState] = useState<FlowState>({ phase: 'idle' });

	async function handleLogin(provider: OAuthProviderMeta) {
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

	function handleRemove(providerId: string) {
		auth.removeOAuthEntry(providerId);
		void onUpdate();
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

				return (
					<ProviderRow
						key={provider.id}
						provider={provider}
						isSignedIn={isSignedIn}
						flowState={isActive ? flowState : { phase: 'idle' }}
						isActive={isActive}
						onLogin={handleLogin}
						onRemove={handleRemove}
						onDismiss={dismissFlow}
					/>
				);
			})}
		</div>
	);
}
