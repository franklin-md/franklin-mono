import { useCallback, useEffect, useState } from 'react';

import type { AuthFile } from '@franklin/agent/browser';

import { ApiKeyPanel } from './api-key-panel.js';
import { useAuthStore } from './auth-context.js';
import type { OAuthLoginFn, OAuthProviderMeta } from './oauth-panel.js';
import { OAuthPanel } from './oauth-panel.js';

type Tab = 'oauth' | 'apiKeys';

/**
 * Full-screen overlay modal for authentication.
 *
 * Shows two tabs:
 * - **OAuth Providers**: list of OAuth providers with sign-in buttons and inline flow
 * - **API Keys**: manage stored API keys for any provider
 *
 * `onClose` is called when the user dismisses the modal (backdrop click or × button).
 * `onEntriesChange` is called with the latest entries after any mutation so the
 * caller (e.g. `AuthButton`) can update its own derived state without re-reading disk.
 */
export function AuthModal({
	onClose,
	onEntriesChange,
	oauthProviders,
	apiKeyProviders,
	onLogin,
	onOpenUrl,
}: {
	onClose: () => void;
	onEntriesChange?: (entries: AuthFile) => void;
	oauthProviders: OAuthProviderMeta[];
	apiKeyProviders: OAuthProviderMeta[];
	onLogin: OAuthLoginFn;
	onOpenUrl?: (url: string) => void | Promise<void>;
}) {
	const store = useAuthStore();
	const [tab, setTab] = useState<Tab>('oauth');
	const [savedEntries, setSavedEntries] = useState<AuthFile>({});

	useEffect(() => {
		let cancelled = false;

		async function loadEntries() {
			const entries = await store.load();
			if (!cancelled) {
				setSavedEntries(entries);
				onEntriesChange?.(entries);
			}
		}

		void loadEntries();

		return () => {
			cancelled = true;
		};
	}, [store, onEntriesChange]);

	const handleUpdate = useCallback(() => {
		return store.load().then((entries) => {
			setSavedEntries(entries);
			onEntriesChange?.(entries);
		});
	}, [store, onEntriesChange]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Authentication"
			style={overlayStyle}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div style={panelStyle}>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 16,
					}}
				>
					<h2
						style={{
							margin: 0,
							fontSize: 18,
							fontWeight: 600,
							color: '#1a1a1a',
						}}
					>
						Authentication
					</h2>
					<button
						aria-label="Close"
						onClick={onClose}
						style={{
							border: 'none',
							background: 'none',
							fontSize: 22,
							lineHeight: 1,
							cursor: 'pointer',
							color: '#888',
							padding: '2px 6px',
						}}
					>
						×
					</button>
				</div>

				{/* Tabs */}
				<div
					style={{
						display: 'flex',
						gap: 4,
						marginBottom: 20,
						borderBottom: '1px solid #e0e0e0',
						paddingBottom: 0,
					}}
				>
					<TabButton
						active={tab === 'oauth'}
						onClick={() => {
							setTab('oauth');
						}}
					>
						OAuth Providers
					</TabButton>
					<TabButton
						active={tab === 'apiKeys'}
						onClick={() => {
							setTab('apiKeys');
						}}
					>
						API Keys
					</TabButton>
				</div>

				{/* Both panels stay mounted so an in-progress OAuth flow is never lost */}
				<div style={{ display: tab === 'oauth' ? 'block' : 'none' }}>
					<OAuthPanel
						savedEntries={savedEntries}
						onUpdate={handleUpdate}
						providers={oauthProviders}
						onLogin={onLogin}
						onOpenUrl={onOpenUrl}
					/>
				</div>
				<div style={{ display: tab === 'apiKeys' ? 'block' : 'none' }}>
					<ApiKeyPanel
						savedEntries={savedEntries}
						onUpdate={handleUpdate}
						providers={apiKeyProviders}
					/>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TabButton
// ---------------------------------------------------------------------------

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: '8px 16px',
				border: 'none',
				background: 'none',
				cursor: 'pointer',
				fontSize: 13,
				fontWeight: active ? 600 : 400,
				color: active ? '#1a73e8' : '#555',
				borderBottom: active ? '2px solid #1a73e8' : '2px solid transparent',
				marginBottom: -1,
				borderRadius: 0,
			}}
		>
			{children}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
	position: 'fixed',
	inset: 0,
	background: 'rgba(0, 0, 0, 0.45)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	zIndex: 9999,
};

const panelStyle: React.CSSProperties = {
	background: '#fff',
	borderRadius: 10,
	padding: 24,
	width: 500,
	maxWidth: '92vw',
	maxHeight: '82vh',
	overflow: 'auto',
	boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};
