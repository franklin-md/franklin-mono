import { useEffect, useState, type FormEvent } from 'react';

import type { AuthFile, ApiKeyEntry } from '@franklin/agent/browser';

import { useAuthStore } from './auth-context.js';
import type { OAuthProviderMeta } from './oauth-panel.js';

// ---------------------------------------------------------------------------
// MaskedKey — show/hide the stored key
// ---------------------------------------------------------------------------

function MaskedKey({ value }: { value: string }) {
	const [revealed, setRevealed] = useState(false);
	const masked = `${value.slice(0, 4)}${'•'.repeat(Math.min(20, Math.max(0, value.length - 4)))}`;

	return (
		<span style={{ fontFamily: 'monospace', fontSize: 13 }}>
			{revealed ? value : masked}
			<button
				onClick={() => {
					setRevealed((r) => !r);
				}}
				style={{
					marginLeft: 6,
					border: 'none',
					background: 'none',
					color: '#1a73e8',
					cursor: 'pointer',
					fontSize: 12,
					padding: 0,
				}}
			>
				{revealed ? 'Hide' : 'Show'}
			</button>
		</span>
	);
}

// ---------------------------------------------------------------------------
// ApiKeyPanel
// ---------------------------------------------------------------------------

/**
 * Displays all stored API-key entries and provides a form to add new ones.
 *
 * `savedEntries` is owned by the parent — the panel never reads from disk.
 * `onUpdate` is called after any mutation so the parent can reload and re-pass entries.
 */
export function ApiKeyPanel({
	savedEntries,
	onUpdate,
	providers,
}: {
	savedEntries: AuthFile;
	onUpdate: () => Promise<void>;
	providers: OAuthProviderMeta[];
}) {
	const store = useAuthStore();

	const [provider, setProvider] = useState(providers[0]?.id ?? '');
	const [key, setKey] = useState('');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!provider && providers[0]) {
			setProvider(providers[0].id);
		}
	}, [provider, providers]);

	const apiKeyEntries = Object.entries(savedEntries).filter(([, entry]) =>
		Boolean(entry.apiKey),
	) as [
		string,
		AuthFile[string] & { apiKey: { type: 'apiKey'; key: string } },
	][];

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!provider.trim()) {
			setError('Provider name is required');
			return;
		}
		if (!key.trim()) {
			setError('API key is required');
			return;
		}
		const entry: ApiKeyEntry = { type: 'apiKey', key: key.trim() };
		await store.setApiKeyEntry(provider.trim(), entry);
		setProvider('');
		setKey('');
		setError(null);
		await onUpdate();
	}

	async function handleRemove(providerId: string) {
		await store.removeApiKeyEntry(providerId);
		await onUpdate();
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{/* Existing keys table */}
			{apiKeyEntries.length > 0 && (
				<table
					style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
				>
					<thead>
						<tr style={{ borderBottom: '1px solid #e0e0e0' }}>
							<th style={thStyle}>Provider</th>
							<th style={thStyle}>Key</th>
							<th style={{ ...thStyle, width: 60 }}></th>
						</tr>
					</thead>
					<tbody>
						{apiKeyEntries.map(([id, entry]) => (
							<tr key={id} style={{ borderBottom: '1px solid #f0f0f0' }}>
								<td style={tdStyle}>{id}</td>
								<td style={tdStyle}>
									<MaskedKey value={entry.apiKey.key} />
								</td>
								<td style={tdStyle}>
									<button
										onClick={() => {
											void handleRemove(id);
										}}
										style={{
											border: '1px solid #ccc',
											background: '#fff',
											color: '#c62828',
											borderRadius: 4,
											padding: '3px 8px',
											cursor: 'pointer',
											fontSize: 12,
										}}
									>
										Remove
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{/* Add key form */}
			<div
				style={{
					borderTop: apiKeyEntries.length > 0 ? '1px solid #e0e0e0' : 'none',
					paddingTop: apiKeyEntries.length > 0 ? 12 : 0,
				}}
			>
				<p
					style={{
						margin: '0 0 10px',
						fontWeight: 500,
						fontSize: 14,
						color: '#1a1a1a',
					}}
				>
					Add API Key
				</p>
				<form
					onSubmit={handleSubmit}
					style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
				>
					<select
						value={provider}
						onChange={(e) => {
							setProvider(e.currentTarget.value);
							setError(null);
						}}
						style={inputStyle}
					>
						<option value="" disabled>
							Select a provider
						</option>
						{providers.map((providerOption) => (
							<option key={providerOption.id} value={providerOption.id}>
								{providerOption.name}
							</option>
						))}
					</select>
					<input
						type="password"
						placeholder="API Key"
						value={key}
						onChange={(e) => {
							setKey(e.currentTarget.value);
							setError(null);
						}}
						style={inputStyle}
					/>
					{error && (
						<p style={{ margin: 0, fontSize: 12, color: '#c62828' }}>{error}</p>
					)}
					<div>
						<button
							type="submit"
							style={{
								padding: '7px 16px',
								background: '#1a73e8',
								color: '#fff',
								border: 'none',
								borderRadius: 4,
								fontSize: 13,
								cursor: 'pointer',
							}}
						>
							Save
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
	textAlign: 'left',
	padding: '6px 8px',
	fontWeight: 600,
	color: '#1a1a1a',
};
const tdStyle: React.CSSProperties = { padding: '8px 8px', color: '#1a1a1a' };
const inputStyle: React.CSSProperties = {
	padding: '7px 10px',
	border: '1px solid #ccc',
	borderRadius: 4,
	fontSize: 13,
	width: '100%',
	boxSizing: 'border-box',
	color: '#1a1a1a',
};
