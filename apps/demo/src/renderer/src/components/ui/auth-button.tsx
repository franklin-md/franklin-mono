import { useEffect, useState } from 'react';

import type { AuthFile } from '@franklin/agent/browser';

import { useAuthStore } from './auth-context.js';
import { AuthModal } from './auth-modal.js';
import type { OAuthLoginFn, OAuthProviderMeta } from './oauth-panel.js';

// ---------------------------------------------------------------------------
// PersonIcon — minimal inline SVG, no external dependencies
// ---------------------------------------------------------------------------

function PersonIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// AuthButton
// ---------------------------------------------------------------------------

/**
 * A Google-style sign-in button for the top-right corner of an application.
 *
 * - Shows "Sign in" when no credentials are saved.
 * - Shows the number of configured providers when credentials exist.
 * - Opens `<AuthModal>` on click.
 *
 * Must be rendered inside an `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * // In your app layout:
 * <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
 *   <AuthButton />
 * </div>
 * ```
 */
export function AuthButton({
	oauthProviders,
	apiKeyProviders,
	onLogin,
	onOpenUrl,
}: {
	oauthProviders: OAuthProviderMeta[];
	apiKeyProviders: OAuthProviderMeta[];
	onLogin: OAuthLoginFn;
	onOpenUrl?: (url: string) => void | Promise<void>;
}) {
	const store = useAuthStore();
	const [open, setOpen] = useState(false);
	const [providerCount, setProviderCount] = useState(0);
	const isSignedIn = providerCount > 0;

	useEffect(() => {
		let cancelled = false;

		async function loadProviderCount() {
			const entries = await store.load();
			if (!cancelled) {
				setProviderCount(Object.keys(entries).length);
			}
		}

		void loadProviderCount();

		return () => {
			cancelled = true;
		};
	}, [store]);

	function handleEntriesChange(entries: AuthFile) {
		setProviderCount(Object.keys(entries).length);
	}

	function handleClose() {
		setOpen(false);
	}

	return (
		<>
			<button
				onClick={() => {
					setOpen(true);
				}}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 7,
					padding: '7px 16px',
					borderRadius: 20,
					border: '1px solid #dadce0',
					background: '#fff',
					color: '#3c4043',
					fontSize: 14,
					fontWeight: 500,
					cursor: 'pointer',
					boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
					transition: 'box-shadow 0.15s',
					whiteSpace: 'nowrap',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
				}}
			>
				<PersonIcon />
				{isSignedIn
					? `${providerCount} provider${providerCount > 1 ? 's' : ''}`
					: 'Sign in'}
			</button>

			{open && (
				<AuthModal
					onClose={handleClose}
					onEntriesChange={handleEntriesChange}
					oauthProviders={oauthProviders}
					apiKeyProviders={apiKeyProviders}
					onLogin={onLogin}
					onOpenUrl={onOpenUrl}
				/>
			)}
		</>
	);
}
